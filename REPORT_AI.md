# Workout Tracker 2: AI Technical Audit & Strategy Report

This report outlines high-impact AI integration points using Google Gemini APIs (Nano, Flash, Pro) to enhance the Workout Tracker 2 ecosystem.

---

## Quick Wins (Low Cost, High Impact)

### Feature Name: Intelligent Exercise Auto-Categorization
* **AI Use Case:** Natural Language Processing & Metadata Extraction.
* **Input Data Format:** `JSON` (Partial exercise object with `name` and optional `description`) or `Text` (User-entered name).
* **Output Data Format:** Structured `JSON` matching the `Exercise` entity (primary/secondary muscles, movement patterns, equipment, type).
* **Feasibility & Effectiveness:** **9/10**. Traditional logic requires a static mapping for every possible exercise name. LLMs can infer metadata for obscure or custom exercises (e.g., "Turkish Get-Up" -> Glutes/Shoulders, Hinge/Other, Kettlebell).
* **Recommended Model:** **Gemini Nano (On-device)** for instant feedback as the user types, falling back to **Gemini Flash** for higher accuracy or obscure exercises.
* **Token Efficiency:** Extremely low (~200-300 tokens per request).

### Feature Name: Post-Session Performance Narrative
* **AI Use Case:** Pattern Recognition & Natural Language Generation.
* **Input Data Format:** `JSON` log of a `WorkoutSession` including `SessionSet` results and `ComplianceStatus`.
* **Output Data Format:** `Markdown` summary (1-2 paragraphs) with actionable insights.
* **Feasibility & Effectiveness:** **8/10**. Far more engaging than raw charts. It can translate "Volume increased by 5%" into "Your work capacity is improving, but your RPE 9 on the last set suggests you're approaching a plateau."
* **Recommended Model:** **Gemini Flash (API)**. Fast enough to generate the summary the moment a user hits "Complete Workout."
* **Token Efficiency:** Medium (~1k-2k tokens depending on workout volume).

### Feature Name: Natural Language Workout Parsing
* **AI Use Case:** Structured Data Extraction.
* **Input Data Format:** `Text` (e.g., "I want to do 3 sets of 10 bench press at 80kg, then some pullups").
* **Output Data Format:** Structured `JSON` compatible with `SessionTemplateContent`.
* **Feasibility & Effectiveness:** **9/10**. Manual entry of sets/reps is a major friction point. LLMs excel at mapping messy text to rigid schemas.
* **Recommended Model:** **Gemini Flash (API)**. Requires high precision to ensure correct DB insertion.
* **Token Efficiency:** Low (~500 tokens).

---

## Complex Integrations (High Effort, Transformative Value)

### Feature Name: Vision-to-Data Workout Import
* **AI Use Case:** Multimodal Analysis (OCR + Reasoning).
* **Input Data Format:** `Image` (Screenshot of another app, photo of a whiteboard, or handwritten log).
* **Output Data Format:** Structured `JSON` representing a full `WorkoutSession` or `SessionTemplate`.
* **Feasibility & Effectiveness:** **7/10**. Technically challenging to map random UI layouts to your internal schema, but solves the "data lock-in" problem for users switching from other apps.
* **Recommended Model:** **Gemini Pro (API)**. Required for the high reasoning needed to interpret varying visual layouts and handwriting.
* **Token Efficiency:** High (Multimodal inputs + large structured output).

### Feature Name: Real-time Voice Logging
* **AI Use Case:** Speech-to-Intent (Voice-to-JSON).
* **Input Data Format:** `Audio` (Live stream or small clips) or `Text` (Transcribed).
* **Output Data Format:** Structured `JSON` (e.g., `{"exercise": "Squats", "reps": 8, "load": 100, "rpe": 8}`).
* **Feasibility & Effectiveness:** **6/10**. Extremely useful in a gym environment where hands are busy. Requires low-latency "Wake Word" or "Trigger" detection to be practical.
* **Recommended Model:** **Gemini Nano (On-device)**. Essential for privacy and low latency in environments with poor connectivity (basement gyms).
* **Token Efficiency:** Low-Medium.

### Feature Name: AI Adaptive Fatigue Coach
* **AI Use Case:** Predictive Analytics & Reasoning.
* **Input Data Format:** Historical `JSON` data (last 4 weeks of `WorkoutSession`, `OneRepMaxRecord`, and `BodyWeightRecord`).
* **Output Data Format:** Structured `JSON` with `LoadRange` or `SetCountRange` adjustments for the next session.
* **Feasibility & Effectiveness:** **8/10**. Goes beyond simple linear progression. Can detect "overreaching" patterns that mathematical models miss.
* **Recommended Model:** **Gemini Pro (API)**. Needs significant context of training history and high-level reasoning to provide safe health-related suggestions.
* **Token Efficiency:** High (requires passing significant historical context).

---

## Implementation Constraints & Strategy

### Structured Output Protocol
To ensure the React frontend can consume AI responses without crashing:
1. **Zod Validation:** All AI-generated JSON must be passed through existing Zod schemas (already used in the project via `src/domain/entities.ts` logic).
2. **JSON Mode:** Always use Gemini's `response_mime_type: "application/json"` with a clear schema description in the system prompt.

### Minimizing Hallucinations
- **Strict Enumerations:** Provide the AI with the exact values from `src/domain/enums.ts` (e.g., `Muscle`, `Equipment`, `ObjectiveType`) as valid options.
- **Verification Layer:** AI suggestions for 1RM or Load should be marked as "AI Predicted" in the UI until the user manually confirms or edits them.

### Multimodal Roadmap
The "Quickest" multimodal win is **Exercise Identification via Image**. Users take a photo of a new gym machine, and Gemini Flash identifies the `Equipment`, `MovementPattern`, and `MuscleGroups` instantly.
