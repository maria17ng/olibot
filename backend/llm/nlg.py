"""
Natural Language Generation (NLG) module.
Generates child-friendly, age-appropriate responses using the LLM.
The Safety Shield layer reviews all output before it reaches the student.
"""
from backend.llm.ollama_client import OllamaClient
from backend.db.models import StudentModel

OLIBOT_PERSONA_PROMPT = """You are OLIBOT, a friendly and patient tutoring robot for children aged 3-6 in Spain.
Your personality:
- Speak in simple, cheerful Spanish. Short sentences only.
- Never give direct answers. Always guide with questions and hints (Socratic method).
- Use lots of encouragement and emojis to keep the child engaged.
- If the child is struggling, break the problem into smaller steps.
- Current student: {student_name}, age {student_age}, level {student_level}.
- Current topic: {topic}.

Beliefs about this student (their known knowledge):
{beliefs_summary}
"""


class NLGProcessor:
    """Generates the final agent response using the LLM with OLIBOT's persona."""

    def __init__(self, ollama_client: OllamaClient):
        self.llm = ollama_client

    async def generate_response(
        self,
        student: StudentModel,
        topic: str,
        conversation_history: list[dict],
        agent_instruction: str,
    ) -> str:
        """
        Generates a response following the instruction from the BDI agent.

        Args:
            student: The student ORM object (provides name, age, beliefs).
            topic: Current learning topic (e.g. "letra_A").
            conversation_history: Prior messages as [{"role": ..., "content": ...}].
            agent_instruction: The BDI plan's directive (e.g. "give a hint", "praise the student").
        """
        beliefs_summary = self._format_beliefs(student.beliefs)
        system_prompt = OLIBOT_PERSONA_PROMPT.format(
            student_name=student.name,
            student_age=student.age,
            student_level=student.level,
            topic=topic,
            beliefs_summary=beliefs_summary,
        )

        # Append the BDI instruction as a hidden system cue
        instruction_cue = f"\n[INSTRUCTION FROM BDI AGENT]: {agent_instruction}"
        augmented_system = system_prompt + instruction_cue

        return await self.llm.chat(
            messages=conversation_history,
            system_prompt=augmented_system,
        )

    async def generate_hint(self, student: StudentModel, topic: str, hint_level: int = 1) -> str:
        """
        Generates a Socratic scaffolding hint scaled to the hint level.
        hint_level 1 = very subtle clue, hint_level 3 = near-direct guidance.
        """
        prompt = (
            f"The child needs a level-{hint_level} hint about '{topic}'. "
            f"Do NOT reveal the answer. Guide them with a question."
        )
        return await self.generate_response(
            student=student,
            topic=topic,
            conversation_history=[{"role": "user", "content": prompt}],
            agent_instruction=f"Provide a level-{hint_level} scaffolding hint",
        )

    def _format_beliefs(self, beliefs: dict) -> str:
        if not beliefs:
            return "No prior knowledge recorded yet."
        lines = [f"  - {k}: {v}" for k, v in beliefs.items()]
        return "\n".join(lines)
