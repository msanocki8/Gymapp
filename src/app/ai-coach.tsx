import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { AppBottomBar } from '@/components/app-bottom-bar';
import { useAuth } from '@/hooks/use-auth';
import { useGymApp } from '@/hooks/use-gym-app';
import {
  AiCoachRequestError,
  requestAiCoachReply,
  serializeWorkoutPlans,
  type AiCoachMessage,
} from '@/services/ai-coach';

type ChatMessage = AiCoachMessage & { id: number | 'welcome' };

const quickPrompts = [
  'Boli mnie bark przy wyciskaniu — co zmienić?',
  'Oceń objętość mojego obecnego planu',
  'Zaproponuj zamiennik ćwiczenia',
];

function getPlanCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  const noun = count === 1
    ? 'plan'
    : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)
      ? 'plany'
      : 'planów';
  return `${count} ${noun}`;
}

function getWelcomeMessage(planCount: number) {
  const context = planCount
    ? `Widzę w Twoim kontekście ${getPlanCountLabel(planCount)}.`
    : 'Gdy Twoje plany będą wczytane, uwzględnię je w rozmowie.';
  return `Cześć! ${context} Mogę pomóc dobrać ćwiczenia, dopasować objętość albo znaleźć zamienniki przy bólu.`;
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <View style={styles.formattedMessage}>
      {lines.map((line, lineIndex) => {
        const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
        const lineContent = bulletMatch?.[1] ?? line;
        const fragments = lineContent.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const text = (
          <Text key={`line-${lineIndex}`} style={styles.messageText}>
            {fragments.map((fragment, fragmentIndex) => {
              const isBold = fragment.startsWith('**') && fragment.endsWith('**');
              return (
                <Text
                  key={`fragment-${lineIndex}-${fragmentIndex}`}
                  style={isBold ? styles.messageBold : undefined}>
                  {isBold ? fragment.slice(2, -2) : fragment}
                </Text>
              );
            })}
          </Text>
        );

        if (!lineContent) return <View key={`line-${lineIndex}`} style={styles.messageSpacer} />;
        if (bulletMatch) {
          return (
            <View key={`line-${lineIndex}`} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              {text}
            </View>
          );
        }
        return text;
      })}
    </View>
  );
}

export default function AiCoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userName, plans, plansLoading, plansError, reloadPlans } = useGymApp();
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const nextMessageId = useRef(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const serializedPlans = serializeWorkoutPlans(plans);
  const [webViewportHeight, setWebViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') return;

    const visualViewport = window.visualViewport;
    const html = document.documentElement;
    const body = document.body;
    const previousViewportHeight = html.style.getPropertyValue('--ai-coach-viewport-height');
    const previousViewportHeightPriority = html.style.getPropertyPriority('--ai-coach-viewport-height');
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const updateViewport = () => {
      const height = Math.round(visualViewport?.height ?? window.innerHeight);
      html.style.setProperty('--ai-coach-viewport-height', `${height}px`);
      setWebViewportHeight((current) => current === height ? current : height);
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    updateViewport();
    window.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      if (previousViewportHeight) {
        html.style.setProperty(
          '--ai-coach-viewport-height',
          previousViewportHeight,
          previousViewportHeightPriority,
        );
      } else {
        html.style.removeProperty('--ai-coach-viewport-height');
      }
    };
  }, []);

  useEffect(() => {
    void reloadPlans();
  }, [reloadPlans]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof requestAnimationFrame === 'undefined') {
      scrollRef.current?.scrollToEnd({ animated: false });
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isGenerating, webViewportHeight]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isGenerating) return;

    const userMessage: ChatMessage = {
      id: nextMessageId.current++,
      role: 'user',
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft('');
    setIsGenerating(true);
    setRequestError(null);

    try {
      const reply = await requestAiCoachReply(
        nextMessages
          .filter((message) => message.id !== 'welcome')
          .map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        serializedPlans,
        session?.access_token ?? null,
        session?.user.id ?? null,
      );
      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: 'assistant', content: reply },
      ]);
    } catch (error) {
      setRequestError(error instanceof AiCoachRequestError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Nie udało się uzyskać odpowiedzi. Spróbuj ponownie.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSubmitEditing() {
    void sendMessage(draft);
  }

  const visibleMessages: ChatMessage[] = [
    { id: 'welcome', role: 'assistant', content: getWelcomeMessage(plans.length) },
    ...messages,
  ];
  const contextLabel = plansLoading
    ? 'Wczytywanie planów…'
    : `Kontekst: ${getPlanCountLabel(plans.length)}`;
  const greeting = userName === 'Treningowiec' ? 'Hej!' : `Hej, ${userName}`;

  return (
    <SafeAreaView
      className={Platform.OS === 'web' ? 'ai-coach-viewport' : undefined}
      edges={['top', 'left', 'right']}
      style={styles.safeArea}>
      <AmbientBackground blurTarget={blurTarget} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.keyboardAvoiding}>
        <View style={[styles.page, { paddingBottom: 104 }]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Wróć"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/training');
              }}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                size={18}
                tintColor="#A3E635"
              />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={styles.title}>{greeting}</Text>
              <Text style={styles.subtitle}>Co dziś trenujemy?</Text>
            </View>
            <View style={styles.statusIcon}>
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                size={19}
                tintColor="#A3E635"
              />
            </View>
          </View>

          <View style={styles.contextCard}>
            <View style={styles.onlineDot} />
            <Text style={styles.contextText}>{contextLabel}</Text>
            {plansError ? <Text style={styles.contextError}>· błąd wczytywania</Text> : null}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.conversation}
            contentContainerStyle={styles.conversationContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (Platform.OS === 'web' && typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
              } else {
                scrollRef.current?.scrollToEnd({ animated: true });
              }
            }}>
            {visibleMessages.map((message) => {
              const isAssistant = message.role === 'assistant';
              const content = message.content;
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, !isAssistant && styles.userMessageRow]}>
                  {isAssistant ? (
                    <View style={styles.assistantAvatar}>
                      <SymbolView
                        name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                        size={14}
                        tintColor="#A3E635"
                      />
                    </View>
                  ) : null}
                  <View style={[styles.bubble, isAssistant ? styles.assistantBubble : styles.userBubble]}>
                    {isAssistant ? (
                      <Text style={styles.senderLabel}>TRENER AI</Text>
                    ) : null}
                    <FormattedMessage content={content} />
                  </View>
                </View>
              );
            })}
            {isGenerating ? (
              <View style={styles.messageRow}>
                <View style={styles.assistantAvatar}>
                  <ActivityIndicator size="small" color="#A3E635" />
                </View>
                <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
                  <Text style={styles.typingText}>Trener analizuje plan...</Text>
                  <View style={styles.typingDots}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              </View>
            ) : null}
            {requestError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>{requestError}</Text>
            ) : null}
          </ScrollView>

          <View
            className={Platform.OS === 'web' ? 'ai-coach-composer' : undefined}
            style={[
              styles.composerArea,
              Platform.OS !== 'web' && { paddingBottom: Math.max(insets.bottom, 8) },
            ]}>
            {messages.length === 0 ? (
              <ScrollView
                horizontal
                contentContainerStyle={styles.quickPrompts}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {quickPrompts.map((prompt) => (
                  <Pressable
                    key={prompt}
                    accessibilityRole="button"
                    disabled={isGenerating}
                    onPress={() => void sendMessage(prompt)}
                    style={({ pressed }) => [styles.quickPrompt, pressed && styles.pressed]}>
                    <Text style={styles.quickPromptText}>{prompt}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.inputBar}>
              <TextInput
                accessibilityLabel="Wiadomość do Trenera AI"
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={handleSubmitEditing}
                onKeyPress={(event) => {
                  if (
                    Platform.OS === 'web'
                    && event.nativeEvent.key === 'Enter'
                    && !('shiftKey' in event.nativeEvent && event.nativeEvent.shiftKey)
                  ) {
                    event.preventDefault();
                    void sendMessage(draft);
                  }
                }}
                placeholder="Napisz do trenera, np. jakie masz ćwiczenia lub co Cię boli..."
                placeholderTextColor="rgba(245, 247, 246, 0.42)"
                multiline
                blurOnSubmit={false}
                submitBehavior={Platform.OS === 'web' ? 'submit' : 'newline'}
                editable={!isGenerating}
                returnKeyType={Platform.OS === 'web' ? 'send' : 'default'}
                style={styles.textInput}
                maxLength={2000}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Wyślij wiadomość"
                disabled={!draft.trim() || isGenerating}
                onPress={() => void sendMessage(draft)}
                style={({ pressed }) => [
                  styles.sendButton,
                  (!draft.trim() || isGenerating) && styles.sendButtonDisabled,
                  pressed && draft.trim() && !isGenerating && styles.pressed,
                ]}>
                <SymbolView
                  name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                  size={18}
                  tintColor="#07150C"
                />
              </Pressable>
            </View>
            <Text style={styles.disclaimer}>
              Trener AI analizuje Twoje plany • Nie zastępuje konsultacji lekarskiej
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
      <AppBottomBar
        activeTab={null}
        aiActive
        bottomInset={insets.bottom}
        onNavigate={(tab) => {
          if (tab === 'training') router.replace('/(tabs)/training');
          if (tab === 'history') router.replace('/(tabs)/history');
          if (tab === 'account') router.replace('/(tabs)/account');
        }}
        onStart={() => router.push('/workout-flow')}
        onAiCoach={() => undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#050706',
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
    minHeight: 0,
  },
  page: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 760,
    minHeight: 0,
    paddingHorizontal: 18,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    paddingBottom: 12,
    paddingTop: 6,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  title: {
    color: '#F5F7F6',
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9AA69F',
    fontSize: 11,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(163,230,53,0.1)',
    borderColor: 'rgba(163,230,53,0.18)',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  contextCard: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  onlineDot: {
    backgroundColor: '#4ADE80',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  contextText: {
    color: '#D5DED8',
    fontSize: 11,
    fontWeight: '700',
  },
  contextError: {
    color: '#FCA5A5',
    fontSize: 10,
  },
  conversation: {
    flex: 1,
    minHeight: 0,
  },
  conversationContent: {
    gap: 16,
    paddingBottom: 18,
    paddingTop: 6,
  },
  messageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 9,
    maxWidth: '100%',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  assistantAvatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(163,230,53,0.1)',
    borderColor: 'rgba(163,230,53,0.2)',
    borderRadius: 13,
    borderWidth: 1,
    height: 29,
    justifyContent: 'center',
    width: 29,
  },
  bubble: {
    borderRadius: 21,
    borderWidth: 1,
    maxWidth: '84%',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  assistantBubble: {
    backgroundColor: 'rgba(12,21,15,0.88)',
    borderColor: 'rgba(163,230,53,0.17)',
    borderBottomLeftRadius: 7,
  },
  userBubble: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderColor: 'rgba(74,222,128,0.32)',
    borderBottomRightRadius: 7,
  },
  senderLabel: {
    color: '#A3E635',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  formattedMessage: {
    gap: 3,
  },
  messageText: {
    color: '#E8EEE9',
    fontSize: 14,
    lineHeight: 21,
  },
  messageBold: {
    color: '#F5F7F6',
    fontWeight: '800',
  },
  messageSpacer: {
    height: 5,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7,
  },
  bullet: {
    color: '#A3E635',
    fontSize: 14,
    lineHeight: 21,
  },
  typingBubble: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 45,
  },
  typingText: {
    color: '#9AA69F',
    fontSize: 12,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    backgroundColor: '#A3E635',
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  errorText: {
    alignSelf: 'center',
    color: '#FCA5A5',
    fontSize: 12,
    paddingHorizontal: 8,
  },
  composerArea: {
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  quickPrompts: {
    gap: 8,
    paddingHorizontal: 2,
    paddingBottom: 12,
    paddingRight: 8,
  },
  quickPrompt: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(163,230,53,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: 'center',
    maxWidth: 225,
    minHeight: 43,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  quickPromptText: {
    color: '#D5DED8',
    fontSize: 11,
    lineHeight: 15,
  },
  inputBar: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 7,
  },
  textInput: {
    color: '#F5F7F6',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 120,
    minHeight: 42,
    paddingHorizontal: 9,
    paddingTop: 11,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#A3E635',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(163,230,53,0.35)',
  },
  disclaimer: {
    color: 'rgba(154,166,159,0.7)',
    fontSize: 10,
    paddingTop: 8,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
