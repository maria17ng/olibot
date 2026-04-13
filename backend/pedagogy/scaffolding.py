"""
Scaffolding Engine — Adaptive Pedagogical Support (ZDP-based).

Implements the Zone of Proximal Development (ZDP) model to dynamically
adjust the level of support OLIBOT provides to each student.

Theoretical basis:
    Vygotsky (1978): Learning is most effective when tasks are in the ZDP —
    challenging enough to require support, but reachable with guidance.

OLIBOT's scaffolding levels:
    Level 1 — Subtle nudge:       Student is close to mastering the topic.
                                  OLIBOT asks an indirect question.
    Level 2 — Moderate support:   Student is struggling. OLIBOT provides
                                  a more concrete associative clue.
    Level 3 — Near-direct:        Student is significantly struggling.
                                  OLIBOT gives strong guidance (but not the answer).

Integration with BDI belief base:
    Mastery data is stored in student.beliefs["mastery"] as:
    {
        "vocal_a": {"attempts": 5, "correct": 4, "mastered": true},
        "numero_3": {"attempts": 2, "correct": 1, "mastered": false}
    }
    This mirrors the Jason belief:
        mastery(vocal_a, 5, 4, true).
        mastery(numero_3, 2, 1, false).
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class TopicMastery:
    """
    Tracks a student's progress on a single curriculum topic.

    BDI belief equivalent:
        mastery(TopicId, Attempts, Correct, Mastered).
    """
    topic_id: str
    attempts: int = 0
    correct: int = 0
    mastered: bool = False

    @property
    def success_rate(self) -> float:
        """Fraction of correct answers. Returns 0.0 if no attempts."""
        if self.attempts == 0:
            return 0.0
        return self.correct / self.attempts

    @property
    def incorrect(self) -> int:
        return self.attempts - self.correct

    def to_dict(self) -> dict:
        return {
            "attempts": self.attempts,
            "correct": self.correct,
            "mastered": self.mastered,
        }

    @classmethod
    def from_dict(cls, topic_id: str, data: dict) -> "TopicMastery":
        return cls(
            topic_id=topic_id,
            attempts=data.get("attempts", 0),
            correct=data.get("correct", 0),
            mastered=data.get("mastered", False),
        )


@dataclass
class ScaffoldingState:
    """
    Snapshot of a student's scaffolding context for a given topic
    and conversational turn.
    """
    topic_id: str
    mastery: TopicMastery
    hint_level: int = 1       # Current scaffolding level (1-3)
    consecutive_wrong: int = 0  # Consecutive incorrect attempts in this session


class ScaffoldingEngine:
    """
    Computes adaptive scaffolding based on per-topic mastery.

    All mastery data is read from and written back to the student's
    BDI belief dict, which is persisted in the database.

    ZDP thresholds:
        MASTERY_THRESHOLD   → success_rate ≥ this means topic is mastered
        ZDP_LOWER_BOUND     → success_rate < this means topic is too hard
        MIN_ATTEMPTS        → minimum attempts before evaluating mastery
    """

    MASTERY_THRESHOLD = 0.75    # 75%+ correct = mastered
    ZDP_LOWER_BOUND = 0.20      # Below 20% = outside ZDP (too hard)
    MIN_ATTEMPTS = 3            # Need ≥ 3 attempts to evaluate mastery
    ESCALATE_THRESHOLD = 2      # Wrong answers in a row before escalating hint level

    # ── Belief base serialization ──────────────────────────────────────────

    def extract_mastery(self, beliefs: dict) -> dict[str, TopicMastery]:
        """
        Deserializes mastery data from the student's JSON belief base.

        Jason equivalent:
            .findall(mastery(T,_,_,_), MasteryList)
        """
        raw = beliefs.get("mastery", {})
        return {
            topic_id: TopicMastery.from_dict(topic_id, data)
            for topic_id, data in raw.items()
        }

    def merge_mastery_to_beliefs(
        self,
        mastery_map: dict[str, TopicMastery],
        beliefs: dict,
    ) -> dict:
        """
        Serializes updated mastery data back into the belief dict.
        Returns a new beliefs dict (does not mutate the input).
        """
        updated = dict(beliefs)
        updated["mastery"] = {
            topic_id: tm.to_dict()
            for topic_id, tm in mastery_map.items()
        }
        return updated

    # ── Mastery updates ────────────────────────────────────────────────────

    def record_attempt(
        self,
        beliefs: dict,
        topic_id: str,
        is_correct: bool,
    ) -> dict:
        """
        Records a student's attempt on a topic and returns updated beliefs.

        Jason equivalent:
            +!update_mastery(TopicId, IsCorrect) <-
                ... NewAttempts = Attempts + 1; ...
                -+mastery(TopicId, NewAttempts, NewCorrect, IsMastered).

        Args:
            beliefs:    Current student belief dict
            topic_id:   The topic being practiced
            is_correct: Whether the student's answer was correct

        Returns:
            Updated beliefs dict with new mastery data
        """
        mastery_map = self.extract_mastery(beliefs)
        current = mastery_map.get(topic_id, TopicMastery(topic_id=topic_id))

        new_attempts = current.attempts + 1
        new_correct = current.correct + (1 if is_correct else 0)
        new_rate = new_correct / new_attempts

        new_mastered = (
            new_rate >= self.MASTERY_THRESHOLD
            and new_attempts >= self.MIN_ATTEMPTS
        )

        mastery_map[topic_id] = TopicMastery(
            topic_id=topic_id,
            attempts=new_attempts,
            correct=new_correct,
            mastered=new_mastered,
        )

        return self.merge_mastery_to_beliefs(mastery_map, beliefs)

    # ── Scaffolding level computation ──────────────────────────────────────

    def get_hint_level(self, beliefs: dict, topic_id: str) -> int:
        """
        Computes the appropriate scaffolding level for a student on a topic.

        Mapping (mirrors Jason plan !calculate_hint_level):
            success_rate ≥ 0.60 → level 1 (subtle)
            success_rate ≥ 0.30 → level 2 (moderate)
            success_rate <  0.30 → level 3 (near-direct)

        For topics never attempted: level 1 (default, hopeful start).
        """
        mastery_map = self.extract_mastery(beliefs)
        topic_mastery = mastery_map.get(topic_id)

        if topic_mastery is None or topic_mastery.attempts == 0:
            return 1  # Never tried → start gently

        rate = topic_mastery.success_rate
        if rate >= 0.60:
            return 1
        if rate >= 0.30:
            return 2
        return 3

    def should_advance_topic(self, beliefs: dict, topic_id: str) -> bool:
        """
        Returns True if the student has mastered this topic and should
        move on to the next one.

        Jason equivalent:
            mastered(StudentId, TopicId) & min_attempts_met(TopicId)
        """
        mastery_map = self.extract_mastery(beliefs)
        tm = mastery_map.get(topic_id)
        if tm is None:
            return False
        return tm.mastered

    def get_scaffolding_state(self, beliefs: dict, topic_id: str) -> ScaffoldingState:
        """
        Returns a complete scaffolding snapshot for the current topic.
        Used by SessionManager to pass context to BDI and NLG.
        """
        mastery_map = self.extract_mastery(beliefs)
        mastery = mastery_map.get(topic_id, TopicMastery(topic_id=topic_id))
        hint_level = self.get_hint_level(beliefs, topic_id)
        return ScaffoldingState(
            topic_id=topic_id,
            mastery=mastery,
            hint_level=hint_level,
        )

    # ── Summary stats for reports ──────────────────────────────────────────

    def get_overall_success_rate(self, beliefs: dict) -> float:
        """Aggregate success rate across all attempted topics."""
        mastery_map = self.extract_mastery(beliefs)
        if not mastery_map:
            return 0.0
        total_attempts = sum(tm.attempts for tm in mastery_map.values())
        total_correct = sum(tm.correct for tm in mastery_map.values())
        if total_attempts == 0:
            return 0.0
        return total_correct / total_attempts

    def get_mastered_topic_ids(self, beliefs: dict) -> list[str]:
        """Returns list of topic IDs that are fully mastered."""
        mastery_map = self.extract_mastery(beliefs)
        return [topic_id for topic_id, tm in mastery_map.items() if tm.mastered]

    def get_topics_in_progress(self, beliefs: dict) -> list[str]:
        """Returns topic IDs that have been attempted but not mastered."""
        mastery_map = self.extract_mastery(beliefs)
        return [
            topic_id for topic_id, tm in mastery_map.items()
            if tm.attempts > 0 and not tm.mastered
        ]