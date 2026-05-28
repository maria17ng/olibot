/**
 * RiveAvatar — loads a .riv file and maps OLIBOT states to state machine inputs.
 *
 * Discovers the state machine and inputs dynamically at runtime (no hardcoded names).
 * Falls back to DiceBearAvatar if the .riv file fails to load.
 *
 * OLIBOT states: idle | speaking | listening | thinking
 */
import { useState, useEffect, useRef } from "react";
import { useRive } from "@rive-app/react-canvas";
import DiceBearAvatar from "./DiceBearAvatar";

// Keyword fragments to match against input names for each OLIBOT state
const STATE_HINTS = {
  speaking:  ["talk", "speak", "mouth", "chat", "active", "wave"],
  listening: ["listen", "hear", "watch", "alert", "hover", "attention", "ear"],
  thinking:  ["think", "idle", "blink", "wait", "process", "sleep"],
  idle:      ["idle", "rest", "float", "loop"],
};

function findInput(inputs, state) {
  const hints = STATE_HINTS[state] ?? [];
  for (const hint of hints) {
    const found = inputs.find((i) => i.name.toLowerCase().includes(hint));
    if (found) return found;
  }
  return null;
}

export default function RiveAvatar({
  src = "/assets/3364-7075-cute-robot.riv",
  state = "idle",
  size = 130,
  seed,          // used only for DiceBear fallback
}) {
  const [loadError, setLoadError] = useState(false);

  const smNameRef    = useRef(null);
  const inputsRef    = useRef([]);
  const discoveredRef = useRef(false);

  const { rive, RiveComponent } = useRive({
    src,
    autoplay: true,
    onLoadError: () => setLoadError(true),
  });

  // Discover state machine and inputs once, after rive loads
  useEffect(() => {
    if (!rive || discoveredRef.current) return;
    discoveredRef.current = true;

    try {
      const sms = rive.stateMachineNames;
      if (sms?.length) {
        const smName = sms[0];
        smNameRef.current = smName;
        rive.play(smName);
        const inputs = rive.stateMachineInputs(smName) || [];
        inputsRef.current = inputs;
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[RiveAvatar] SM:", smName,
            "inputs:", inputs.map((i) => `${i.name}(type=${i.type})`)
          );
        }
      }
    } catch {
      // file has no state machines — default animation plays via autoplay
    }
  }, [rive]);

  // Drive state machine inputs when OLIBOT state changes
  useEffect(() => {
    if (!rive || !smNameRef.current || !inputsRef.current.length) return;

    const inputs = inputsRef.current;

    // Reset all boolean inputs to false
    inputs.forEach((inp) => {
      if (inp.type === 59 /* Boolean */) inp.value = false;
    });

    const target = findInput(inputs, state);
    if (target) {
      if (target.type === 59 /* Boolean */)  target.value = true;
      else if (target.type === 58 /* Trigger */) target.fire();
      // Number inputs are left for future mapping
    }
  }, [rive, state]);

  if (loadError) {
    return <DiceBearAvatar seed={seed} state={state} size={size} />;
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "inline-block",
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      <RiveComponent />
    </div>
  );
}