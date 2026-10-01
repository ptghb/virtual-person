import unittest

from domain.relationship_service import RelationshipService
from schemas.relationship import RelationshipProfile


class FakeRelationshipRepository:
    def __init__(self):
        self.profile = None

    def get_or_create(self, user_id, companion_id):
        if self.profile is None:
            self.profile = RelationshipProfile(
                user_id=user_id,
                companion_id=companion_id,
                stage='初识',
                affinity_score=0,
                trust_score=0,
                interaction_count=0,
                shared_event_count=0,
                last_interaction_at=None,
                created_at='now',
                updated_at='now',
            )
        return self.profile

    def update(self, profile):
        self.profile = profile
        return profile

    def reset(self, user_id, companion_id):
        self.profile = RelationshipProfile(
            user_id=user_id,
            companion_id=companion_id,
            stage='初识',
            affinity_score=0,
            trust_score=0,
            interaction_count=0,
            shared_event_count=0,
            last_interaction_at=None,
            created_at='now',
            updated_at='now',
        )
        return self.profile


class RelationshipServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = RelationshipService(FakeRelationshipRepository())

    def test_warm_and_vulnerable_messages_raise_scores(self):
        profile = self.service.record_interaction(
            user_id='user_test',
            companion_id='companion_test',
            user_message='谢谢你陪我，我今天压力很大，想抱抱。',
        )
        self.assertEqual(profile.interaction_count, 1)
        self.assertGreaterEqual(profile.affinity_score, 4)
        self.assertGreaterEqual(profile.trust_score, 3)

    def test_repeated_stable_interactions_reach_familiar_stage(self):
        for _ in range(13):
            profile = self.service.record_interaction(
                user_id='user_test',
                companion_id='companion_test',
                user_message='今天一起聊聊天。',
            )
        self.assertEqual(profile.stage, '熟悉')
        self.assertEqual(profile.shared_event_count, 13)

    def test_reset_does_not_need_to_delete_memories(self):
        self.service.record_interaction(
            user_id='user_test',
            companion_id='companion_test',
            user_message='我喜欢和你一起看电影。',
        )
        profile = self.service.reset_profile('user_test', 'companion_test')
        self.assertEqual(profile.stage, '初识')
        self.assertEqual(profile.affinity_score, 0)
        self.assertEqual(profile.interaction_count, 0)


if __name__ == '__main__':
    unittest.main()
