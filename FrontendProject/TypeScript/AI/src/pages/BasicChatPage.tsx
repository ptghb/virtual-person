import React from 'react';
import { AppShell } from '../components/AppShell';
import { ConversationPanel } from '../components/ConversationPanel';
import { DigitalHumanStage } from '../components/DigitalHumanStage';
import { MemoryStatusStrip } from '../components/MemoryStatusStrip';
import { useConversationSession } from '../hooks/useConversationSession';

export const BasicChatPage: React.FC = () => {
  const session = useConversationSession('basic_user', true);

  return (
    <AppShell
      mode="basic"
      connectionState={session.connectionState}
      stage={
        <DigitalHumanStage
          subtitle={session.latestAssistantText}
          thinking={session.isThinking}
          streaming={session.isStreamingReply}
        />
      }
    >
      <ConversationPanel
        messages={session.messages}
        connected={session.isConnected}
        thinking={session.isThinking}
        audioEnabled={session.audioEnabled}
        onAudioEnabledChange={session.setAudioEnabled}
        onSend={session.sendText}
        onClear={session.clearMessages}
        title="对话记录"
        statusStrip={
          <MemoryStatusStrip
            relationship={session.memorySnapshot.relationship}
            followups={session.memorySnapshot.followups}
            refreshing={session.memorySnapshot.refreshing}
          />
        }
      />
    </AppShell>
  );
};
