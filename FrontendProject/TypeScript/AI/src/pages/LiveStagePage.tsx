import React from 'react';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { useConversationSession } from '../hooks/useConversationSession';

export const LiveStagePage: React.FC = () => {
  const session = useConversationSession('livestream_user', true);
  const params = new URLSearchParams(window.location.search);
  const transparent = params.get('transparent') !== '0';
  const showSubtitle = params.get('subtitle') !== '0';
  const showStatus = params.get('status') === '1';

  return (
    <div className={`live-stage ${transparent ? 'live-stage--transparent' : ''}`}>
      <DigitalHumanStage
        transparent={transparent}
        subtitle={showSubtitle ? session.latestAssistantText : ''}
        thinking={session.isThinking}
      />
      {showStatus && (
        <div className="live-stage__status">
          <ConnectionBadge state={session.connectionState} />
        </div>
      )}
    </div>
  );
};
