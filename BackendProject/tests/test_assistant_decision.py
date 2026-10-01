import unittest

from domain.assistant_decision_service import AssistantDecisionService


class AssistantDecisionServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = AssistantDecisionService()

    def build(self, **overrides):
        arguments = {
            "reply_id": "reply_test",
            "prompt": "你看看我今天的发型",
            "model_name": "Hiyori",
            "mode": "advanced",
            "has_image": False,
            "emotion_state": {
                "emotion": "shy",
                "emotion_label": "害羞",
                "intensity": 0.67,
                "reason": "用户表达亲密互动",
            },
            "animation_selector": lambda emotion, model: 2,
            "expression_selector": lambda emotion, model: "Blushing",
            "photo_selector": lambda text: "看看我" in text,
        }
        arguments.update(overrides)
        return self.service.build(**arguments)

    def test_builds_one_complete_decision(self):
        decision = self.build()
        self.assertEqual(decision.reply_id, "reply_test")
        self.assertEqual(decision.emotion, "shy")
        self.assertEqual(decision.animation_index, 2)
        self.assertEqual(decision.expression, "Blushing")
        self.assertTrue(decision.should_take_photo)

    def test_photo_is_restricted_to_advanced_mode_without_image(self):
        self.assertFalse(self.build(mode="chat").should_take_photo)
        self.assertFalse(self.build(has_image=True).should_take_photo)

    def test_invalid_emotion_and_intensity_are_normalized(self):
        decision = self.build(
            emotion_state={
                "emotion": "unknown",
                "emotion_label": "",
                "intensity": 9,
                "reason": "",
            }
        )
        self.assertEqual(decision.emotion, "neutral")
        self.assertEqual(decision.emotion_intensity, 1.0)
        self.assertEqual(decision.emotion_label, "平静")

    def test_legacy_payload_contains_new_decision_contract(self):
        decision = self.build()
        payload = decision.to_legacy_meta()
        self.assertEqual(payload["animation_index"], 2)
        self.assertEqual(payload["decision"]["protocol_version"], "2.0")
        self.assertEqual(payload["protocol_version"], "2.0")


if __name__ == "__main__":
    unittest.main()
