import unittest

from main import analyze_companion_emotion


class EmotionStateTests(unittest.TestCase):
    def test_worry_keywords(self):
        state = analyze_companion_emotion("今天好累，压力好大", {})
        self.assertEqual(state["emotion"], "worried")
        self.assertGreaterEqual(state["intensity"], 0.5)

    def test_shy_keywords(self):
        state = analyze_companion_emotion("我好喜欢你，抱抱", {})
        self.assertEqual(state["emotion"], "shy")

    def test_state_decay(self):
        state = analyze_companion_emotion(
            "嗯",
            {"emotion": "worried", "intensity": 0.8, "reason": "测试"},
        )
        self.assertEqual(state["emotion"], "worried")
        self.assertAlmostEqual(state["intensity"], 0.68, places=2)

    def test_recovery_keyword_overrides_previous_state(self):
        state = analyze_companion_emotion(
            "好多了，谢谢你",
            {"emotion": "worried", "intensity": 0.8, "reason": "测试"},
        )
        self.assertEqual(state["emotion"], "happy")

    def test_neutral_state_decays_to_neutral(self):
        state = analyze_companion_emotion(
            "嗯",
            {"emotion": "happy", "intensity": 0.1, "reason": "测试"},
        )
        self.assertEqual(state["emotion"], "neutral")
        self.assertEqual(state["intensity"], 0.0)


if __name__ == "__main__":
    unittest.main()
