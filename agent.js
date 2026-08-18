/* ------------------------------------------------------------------ */
/* DOM references                                                     */
/* ------------------------------------------------------------------ */

const page = document.querySelector(".page");
const input = document.getElementById("chatinput");
const sendBtn = document.getElementById("chatinput-send-message-button");
const placeholder = document.getElementById("chat-placeholder");
const typedPhrase = document.getElementById("typed-phrase");
const chatForm = document.getElementById("chat-input");
const micBtn = document.getElementById("mic-btn");
const content = document.querySelector(".content");
const heading = document.querySelector(".heading");
const chatArea = document.querySelector(".chat-area");
const chatSession = document.querySelector(".chat-session");
const messagesEl = document.getElementById("messages");
const voiceWave = document.querySelector(".voice-wave");
const voiceGlowCanvas = document.getElementById("voice-glow-canvas");
const historyToggle = document.getElementById("history-toggle");
const newChatBtn = document.getElementById("new-chat-btn");
const historyBackdrop = document.getElementById("history-backdrop");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/* ------------------------------------------------------------------ */
/* Placeholder typing animation                                       */
/* ------------------------------------------------------------------ */

const PHRASES = [
  "to generate a report for you ...",
  "to give you insights ...",
  "to summarise data ...",
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingTimer = null;
let animationPaused = false;

function scheduleTypingTick(delay) {
  clearTimeout(typingTimer);
  if (animationPaused) return;
  typingTimer = setTimeout(runTypingTick, delay);
}

function runTypingTick() {
  if (animationPaused) return;

  const phrase = PHRASES[phraseIndex];

  if (!isDeleting) {
    charIndex += 1;
    typedPhrase.textContent = phrase.slice(0, charIndex);

    if (charIndex === phrase.length) {
      isDeleting = true;
      scheduleTypingTick(2200);
      return;
    }

    scheduleTypingTick(45 + Math.random() * 35);
    return;
  }

  charIndex -= 1;
  typedPhrase.textContent = phrase.slice(0, charIndex);

  if (charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % PHRASES.length;
    scheduleTypingTick(350);
    return;
  }

  scheduleTypingTick(28);
}

function updatePlaceholderVisibility() {
  if (isChatActive) {
    placeholder.classList.add("is-hidden");
    return;
  }

  const visible = !input.value.trim() && document.activeElement !== input;
  placeholder.classList.toggle("is-hidden", !visible);

  if (!visible) {
    animationPaused = true;
    clearTimeout(typingTimer);
  } else if (animationPaused) {
    animationPaused = false;
    scheduleTypingTick(isDeleting ? 400 : 600);
  }
}

/* ------------------------------------------------------------------ */
/* Chat session                                                       */
/* ------------------------------------------------------------------ */

const DEMO_RESPONSES = [
  "Based on your latest data, engagement is up 12% quarter over quarter. The strongest lift is coming from returning users.",
  "Here's a quick summary: revenue is trending up, churn is down, and your APAC segment is outperforming the rest.",
  "I can generate a full report from this — want me to break it down by region, product line, or time period?",
  "Three things stand out: conversion improved on mobile, support tickets dropped 8%, and average order value rose slightly.",
  "From what I'm seeing, your top opportunity is doubling down on the channels that drove last month's spike.",
  "I've pulled the key metrics. Overall health looks solid, with one area worth watching in the enterprise funnel.",
];

const CHAT_TRANSITION_MS = 1150;
const CHAT_INPUT_PLACEHOLDER = "Write a message...";
const CHAT_MOVE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

let isChatActive = false;
let isAiResponding = false;
let typingIndicatorEl = null;
let activeHistoryId = null;
let isHistoryOpen = false;

function syncSendButton() {
  const hasText = input.value.trim().length > 0;
  const canSend = hasText && !isAiResponding;
  sendBtn.disabled = !canSend;
  sendBtn.classList.toggle("is-active", canSend);
}

function focusChatInput() {
  if (!isChatActive) return;
  input.focus({ preventScroll: true });
}

function handleChatInputBlur() {
  if (!isChatActive) return;

  requestAnimationFrame(() => {
    const active = document.activeElement;
    if (chatForm.contains(active)) return;
    focusChatInput();
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scrollMessagesToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendUserMessage(text) {
  const message = document.createElement("div");
  message.className = "message message--user";
  message.innerHTML = `<div class="message__bubble">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(message);
  scrollMessagesToBottom();
}

function appendAssistantMessage(text) {
  const message = document.createElement("div");
  message.className = "message message--assistant";
  message.innerHTML = `<div class="message__bubble">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(message);
  scrollMessagesToBottom();
}

function clearMessages() {
  messagesEl.innerHTML = "";
}

function cancelAiResponse() {
  isAiResponding = false;
  removeTypingIndicator();
  syncSendButton();
}

function showTypingIndicator() {
  typingIndicatorEl = document.createElement("div");
  typingIndicatorEl.className = "message message--assistant message--typing";
  typingIndicatorEl.innerHTML = `
    <div class="message__bubble" aria-label="MADA is typing">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  messagesEl.appendChild(typingIndicatorEl);
  scrollMessagesToBottom();
  return typingIndicatorEl;
}

function removeTypingIndicator() {
  if (typingIndicatorEl) {
    typingIndicatorEl.remove();
    typingIndicatorEl = null;
  }
}

function getRandomResponse() {
  return DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
}

function streamAssistantMessage(text) {
  const message = document.createElement("div");
  message.className = "message message--assistant";
  const bubble = document.createElement("div");
  bubble.className = "message__bubble";
  message.appendChild(bubble);
  messagesEl.appendChild(message);
  scrollMessagesToBottom();

  let index = 0;
  const baseDelay = prefersReducedMotion ? 0 : 14;

  function typeNextChar() {
    if (index < text.length) {
      index += 1;
      bubble.textContent = text.slice(0, index);
      scrollMessagesToBottom();
      const delay = prefersReducedMotion
        ? 0
        : baseDelay + Math.random() * 16;
      setTimeout(typeNextChar, delay);
      return;
    }

    isAiResponding = false;
    syncSendButton();
    input.focus();
  }

  if (prefersReducedMotion) {
    bubble.textContent = text;
    isAiResponding = false;
    syncSendButton();
    input.focus();
    scrollMessagesToBottom();
    return;
  }

  typeNextChar();
}

function simulateAiResponse() {
  isAiResponding = true;
  syncSendButton();
  focusChatInput();
  showTypingIndicator();

  const thinkDelay = prefersReducedMotion
    ? 200
    : 900 + Math.random() * 1100;

  setTimeout(() => {
    removeTypingIndicator();
    streamAssistantMessage(getRandomResponse());
  }, thinkDelay);
}

function finishChatSlide() {
  chatSession.style.transition = "";
  chatSession.style.transform = "";
  chatSession.style.willChange = "";
  page.classList.remove("is-chat-entering");
}

function animateChatSlide(deltaY) {
  if (prefersReducedMotion || Math.abs(deltaY) < 2) {
    finishChatSlide();
    return;
  }

  chatSession.style.willChange = "transform";
  chatSession.style.transform = `translate3d(0, ${deltaY}px, 0)`;
  chatSession.style.transition = "none";
  chatSession.getBoundingClientRect();

  chatSession.style.transition = `transform ${CHAT_TRANSITION_MS}ms ${CHAT_MOVE_EASE}`;
  chatSession.style.transform = "translate3d(0, 0, 0)";

  chatSession.addEventListener(
    "transitionend",
    function onSlideEnd(event) {
      if (event.propertyName !== "transform") return;
      finishChatSlide();
      chatSession.removeEventListener("transitionend", onSlideEnd);
    },
  );
}

function enterChatMode({ skipAnimation = false } = {}) {
  if (isChatActive) return;

  isChatActive = true;
  animationPaused = true;
  clearTimeout(typingTimer);
  placeholder.classList.add("is-hidden");
  input.placeholder = CHAT_INPUT_PLACEHOLDER;
  page.classList.add("is-chat-active");
  chatArea.classList.add("glow-settled");

  if (skipAnimation) {
    requestAnimationFrame(() => focusChatInput());
    return;
  }

  const startRect = chatSession.getBoundingClientRect();
  page.classList.add("is-chat-entering");

  const endRect = chatSession.getBoundingClientRect();
  animateChatSlide(startRect.top - endRect.top);

  requestAnimationFrame(() => focusChatInput());
}

function resizeChatInput() {
  input.style.height = "auto";

  const maxHeight = parseFloat(getComputedStyle(input).maxHeight);
  const scrollHeight = input.scrollHeight;
  const nextHeight =
    Number.isFinite(maxHeight) && maxHeight > 0
      ? Math.min(scrollHeight, maxHeight)
      : scrollHeight;

  input.style.height = `${nextHeight}px`;
  input.style.overflowY = scrollHeight > nextHeight + 1 ? "auto" : "hidden";
}

function handleInput() {
  resizeChatInput();
  syncSendButton();
  updatePlaceholderVisibility();
}

function handleKeydown(e) {
  if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;

  e.preventDefault();
  if (!sendBtn.disabled) {
    chatForm.requestSubmit();
  }
}

function handleSubmit(e) {
  e.preventDefault();

  const text = input.value.trim();
  if (!text || isAiResponding) return;

  const isFirstMessage = !isChatActive;

  appendUserMessage(text);
  input.value = "";
  resizeChatInput();
  syncSendButton();
  updatePlaceholderVisibility();

  if (isFirstMessage) {
    activeHistoryId = null;
    renderHistoryList();
    enterChatMode();
    setTimeout(simulateAiResponse, CHAT_TRANSITION_MS);
  } else {
    simulateAiResponse();
  }

  focusChatInput();
}

/* ------------------------------------------------------------------ */
/* Chat history                                                       */
/* ------------------------------------------------------------------ */

const DEMO_CHAT_HISTORY = [
  {
    id: "q4-engagement",
    title: "Q4 Engagement Report",
    messages: [
      {
        role: "user",
        text: "Summarise our Q4 engagement metrics.",
      },
      {
        role: "assistant",
        text: "Engagement rose 12% quarter over quarter. Returning users drove most of the lift, especially on mobile.",
      },
      {
        role: "user",
        text: "Which region performed best?",
      },
      {
        role: "assistant",
        text: "APAC led with 18% growth, followed by EMEA at 9%. North America was steady at 4%.",
      },
    ],
  },
  {
    id: "revenue-snapshot",
    title: "Revenue Snapshot",
    messages: [
      {
        role: "user",
        text: "Give me a quick revenue overview for this month.",
      },
      {
        role: "assistant",
        text: "Revenue is up 7% month over month. Subscription renewals improved and average order value ticked up slightly.",
      },
    ],
  },
  {
    id: "churn-analysis",
    title: "Churn Analysis",
    messages: [
      {
        role: "user",
        text: "Why did churn spike last week?",
      },
      {
        role: "assistant",
        text: "Most cancellations came from the starter plan after the pricing email. Enterprise churn stayed flat.",
      },
      {
        role: "user",
        text: "Any quick wins to reduce it?",
      },
      {
        role: "assistant",
        text: "A targeted retention offer for starter users who opened the email but did not upgrade could help within days.",
      },
    ],
  },
  {
    id: "apac-expansion",
    title: "APAC Expansion Plan",
    messages: [
      {
        role: "user",
        text: "Draft talking points for our APAC expansion review.",
      },
      {
        role: "assistant",
        text: "Lead with market size, highlight local partnerships, and show early conversion data from the Singapore pilot.",
      },
    ],
  },
  {
    id: "support-trends",
    title: "Support Ticket Trends",
    messages: [
      {
        role: "user",
        text: "What are the top support themes this week?",
      },
      {
        role: "assistant",
        text: "Billing questions are down 8%. Onboarding setup and API integration requests are the two rising categories.",
      },
    ],
  },
  {
    id: "board-deck",
    title: "Board Deck Outline",
    messages: [
      {
        role: "user",
        text: "Outline a board deck for next Friday.",
      },
      {
        role: "assistant",
        text: "Open with KPIs, cover product milestones, then risks. Close with Q2 priorities and resource asks.",
      },
    ],
  },
];

function renderHistoryList() {
  historyList.innerHTML = DEMO_CHAT_HISTORY.map(
    (chat) => `
      <li class="history-item${chat.id === activeHistoryId ? " is-active" : ""}">
        <button
          type="button"
          class="history-item__btn"
          data-history-id="${chat.id}"
        >
          ${escapeHtml(chat.title)}
        </button>
      </li>
    `,
  ).join("");
}

function setHistoryOpen(open) {
  isHistoryOpen = open;
  document.body.classList.toggle("is-history-open", open);
  historyPanel.classList.toggle("is-open", open);
  historyBackdrop.classList.toggle("is-visible", open);
  historyToggle.classList.toggle("is-active", open);
  historyToggle.setAttribute("aria-expanded", String(open));
  historyPanel.setAttribute("aria-hidden", String(!open));
  historyBackdrop.setAttribute("aria-hidden", String(!open));
  historyToggle.setAttribute(
    "aria-label",
    open ? "Close chat history" : "Open chat history",
  );
}

function resetToLanding() {
  cancelAiResponse();
  clearMessages();
  activeHistoryId = null;
  isChatActive = false;

  if (isListening) {
    stopListening();
  }

  page.classList.remove("is-chat-active", "is-chat-entering");
  chatArea.classList.remove(
    "glow-settled",
    "is-listening",
    "is-glow-converging",
    "is-glow-expanding",
  );
  finishChatSlide();

  placeholder.classList.remove("is-hidden");
  input.placeholder = " ";
  input.value = "";
  resizeChatInput();
  syncSendButton();
  animationPaused = false;
  scheduleTypingTick(600);
  updatePlaceholderVisibility();
  renderHistoryList();
}

function startNewChat() {
  closeHistoryPanel();
  resetToLanding();
  input.focus();
}

function openHistoryPanel() {
  renderHistoryList();
  setHistoryOpen(true);
}

function closeHistoryPanel() {
  setHistoryOpen(false);
}

function toggleHistoryPanel() {
  if (isHistoryOpen) {
    closeHistoryPanel();
  } else {
    openHistoryPanel();
  }
}

function loadChatFromHistory(chatId) {
  const chat = DEMO_CHAT_HISTORY.find((item) => item.id === chatId);
  if (!chat) return;

  cancelAiResponse();
  clearMessages();
  activeHistoryId = chat.id;

  if (!isChatActive) {
    enterChatMode({ skipAnimation: true });
  }

  chat.messages.forEach((message) => {
    if (message.role === "user") {
      appendUserMessage(message.text);
    } else {
      appendAssistantMessage(message.text);
    }
  });

  renderHistoryList();
  closeHistoryPanel();
  resizeChatInput();
  focusChatInput();
}

function handleHistoryListClick(event) {
  const button = event.target.closest("[data-history-id]");
  if (!button) return;
  loadChatFromHistory(button.dataset.historyId);
}

function handleHistoryKeydown(event) {
  if (event.key === "Escape" && isHistoryOpen) {
    closeHistoryPanel();
  }
}

/* ------------------------------------------------------------------ */
/* Voice recording & glow animation                                   */
/* ------------------------------------------------------------------ */

const CONVERGE_MS = 1100;
const EXPAND_MS = 1000;
const GLOW_PAD = { x: 36, y: 52 };
const WAVE_POSITION_RATIO = 0.74;
const WAVE_WIDTH_RATIO = 0.78;

let audioContext = null;
let analyser = null;
let mediaStream = null;
let isListening = false;
let glowRaf = null;
let convergeRaf = null;
let voiceWaves = [];
let smoothedVolume = 0;
let convergeProgress = 1;
let isExpanding = false;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function runGlowConverge(onComplete) {
  if (convergeRaf) cancelAnimationFrame(convergeRaf);

  isExpanding = false;
  convergeProgress = 0;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    convergeProgress = easeOutCubic(Math.min(1, elapsed / CONVERGE_MS));

    if (elapsed < CONVERGE_MS) {
      convergeRaf = requestAnimationFrame(tick);
      return;
    }

    convergeProgress = 1;
    convergeRaf = null;
    chatArea.classList.remove("is-glow-converging");
    if (onComplete) onComplete();
  }

  convergeRaf = requestAnimationFrame(tick);
}

function runGlowExpand(onComplete) {
  if (convergeRaf) cancelAnimationFrame(convergeRaf);

  isExpanding = true;
  convergeProgress = 1;
  chatArea.classList.add("is-glow-expanding");
  chatArea.classList.remove("is-listening");
  positionVoiceWave();

  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    convergeProgress = 1 - easeInOutCubic(Math.min(1, elapsed / EXPAND_MS));

    if (elapsed < EXPAND_MS) {
      convergeRaf = requestAnimationFrame(tick);
      return;
    }

    convergeProgress = 0;
    convergeRaf = null;
    isExpanding = false;
    chatArea.classList.remove("is-glow-expanding");
    if (onComplete) onComplete();
  }

  convergeRaf = requestAnimationFrame(tick);
}

function isVoiceWaveActive() {
  return (
    chatArea.classList.contains("is-listening") ||
    chatArea.classList.contains("is-glow-converging") ||
    isExpanding
  );
}

function positionVoiceWave() {
  if (!isVoiceWaveActive()) return;

  const headingRect = heading.getBoundingClientRect();
  const chatRect = chatArea.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const headingBottom = headingRect.bottom - contentRect.top;
  const chatTop = chatRect.top - contentRect.top;
  const waveY = headingBottom + (chatTop - headingBottom) * WAVE_POSITION_RATIO;

  voiceWave.style.top = `${waveY}px`;
}

function createVoiceWaves() {
  voiceWaves = Array.from({ length: 5 }, () => ({
    freq: 0.006 + Math.random() * 0.014,
    amp: 6 + Math.random() * 14,
    phase: Math.random() * Math.PI * 2,
    speed: 0.015 + Math.random() * 0.035,
    opacity: 0.25 + Math.random() * 0.45,
    harmonic: 1.4 + Math.random() * 1.8,
  }));
}

function resizeVoiceGlowCanvas() {
  const rect = voiceGlowCanvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = rect.width + GLOW_PAD.x * 2;
  const cssHeight = rect.height + GLOW_PAD.y * 2;

  voiceGlowCanvas.width = Math.max(1, Math.floor(cssWidth * dpr));
  voiceGlowCanvas.height = Math.max(1, Math.floor(cssHeight * dpr));
  voiceGlowCanvas.style.width = `${cssWidth}px`;
  voiceGlowCanvas.style.height = `${cssHeight}px`;
  voiceGlowCanvas.style.marginLeft = `${-GLOW_PAD.x}px`;
  voiceGlowCanvas.style.marginTop = `${-GLOW_PAD.y}px`;
}

function getVolumeLevel() {
  if (!analyser) return 0;

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  let sum = 0;
  const voiceBins = Math.floor(data.length * 0.45);
  for (let i = 2; i < voiceBins; i += 1) {
    sum += data[i];
  }

  const raw = sum / voiceBins / 255;
  smoothedVolume += (raw - smoothedVolume) * 0.22;
  return Math.min(1, smoothedVolume * 2.4);
}

function drawVoiceGlow(volume) {
  const ctx = voiceGlowCanvas.getContext("2d");
  const width = voiceGlowCanvas.width;
  const height = voiceGlowCanvas.height;
  const dpr = window.devicePixelRatio || 1;
  const padX = GLOW_PAD.x * dpr;
  const padY = GLOW_PAD.y * dpr;
  const drawWidth = width - padX * 2;
  const drawHeight = height - padY * 2;
  const waveInset = (drawWidth * (1 - WAVE_WIDTH_RATIO)) / 2;
  const waveStart = padX + waveInset;
  const waveEnd = width - padX - waveInset;
  const waveDrawWidth = waveEnd - waveStart;
  const forming = smoothstep(0.55, 1, convergeProgress);
  const baseY = padY + drawHeight * 0.5;
  const loudBoost = 0.35 + volume * 0.65;
  const quietFloor = 0.18;
  const motionScale = prefersReducedMotion ? 0.35 : 1;

  ctx.clearRect(0, 0, width, height);

  if (forming <= 0.01) return;

  const waveStrength = forming;

  voiceWaves.forEach((wave) => {
    wave.phase +=
      wave.speed *
      (quietFloor + volume * 2.8) *
      motionScale *
      (0.25 + waveStrength * 0.75);

    ctx.beginPath();
    for (let x = waveStart; x <= waveEnd; x += 2) {
      const t = (x - waveStart) / waveDrawWidth;
      const primary = Math.sin(x * wave.freq + wave.phase) * wave.amp;
      const harmonic =
        Math.sin(x * wave.freq * wave.harmonic + wave.phase * 1.6) *
        wave.amp *
        0.35 *
        volume;
      const displacement =
        (primary + harmonic) *
        (quietFloor + volume * 1.35) *
        loudBoost *
        waveStrength;
      const edgeFade = Math.sin(t * Math.PI);
      const y = baseY + displacement * edgeFade;

      if (x === waveStart) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const gradient = ctx.createLinearGradient(waveStart, 0, waveEnd, 0);
    const alpha = wave.opacity * loudBoost * waveStrength;
    gradient.addColorStop(0, `rgba(92, 81, 255, 0)`);
    gradient.addColorStop(0.14, `rgba(110, 98, 255, ${alpha * 0.45})`);
    gradient.addColorStop(0.5, `rgba(143, 133, 255, ${alpha})`);
    gradient.addColorStop(0.86, `rgba(110, 98, 255, ${alpha * 0.45})`);
    gradient.addColorStop(1, `rgba(92, 81, 255, 0)`);

    ctx.save();
    ctx.strokeStyle = gradient;
    ctx.lineWidth =
      (1.2 + volume * 4.5) * dpr * (0.35 + waveStrength * 0.65);
    ctx.shadowBlur = (8 + volume * 24) * dpr * waveStrength;
    ctx.shadowColor = `rgba(110, 98, 255, ${(0.35 + volume * 0.45) * waveStrength})`;
    ctx.stroke();
    ctx.restore();
  });
}

function animateVoiceGlow() {
  if (!isListening && !isExpanding) return;

  const volume = isListening ? getVolumeLevel() : 0;
  drawVoiceGlow(volume);
  glowRaf = requestAnimationFrame(animateVoiceGlow);
}

async function startListening() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    isListening = true;
    smoothedVolume = 0;
    createVoiceWaves();
    resizeVoiceGlowCanvas();
    positionVoiceWave();
    requestAnimationFrame(positionVoiceWave);
    chatArea.classList.remove("is-glow-expanding");
    chatArea.classList.add(
      "glow-settled",
      "is-listening",
      "is-glow-converging",
    );
    micBtn.classList.add("is-recording");
    micBtn.setAttribute("aria-label", "Stop voice recording");
    micBtn.setAttribute("aria-pressed", "true");
    runGlowConverge();
    animateVoiceGlow();
  } catch (error) {
    console.error("Microphone access failed:", error);
  }
}

function stopListening() {
  isListening = false;
  micBtn.classList.remove("is-recording");
  micBtn.setAttribute("aria-label", "Start voice recording");
  micBtn.setAttribute("aria-pressed", "false");

  runGlowExpand(() => {
    if (glowRaf) {
      cancelAnimationFrame(glowRaf);
      glowRaf = null;
    }

    const ctx = voiceGlowCanvas.getContext("2d");
    ctx.clearRect(0, 0, voiceGlowCanvas.width, voiceGlowCanvas.height);
  });

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  analyser = null;
  smoothedVolume = 0;
  animateVoiceGlow();
}

function handleMicClick() {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function handleResize() {
  if (isVoiceWaveActive()) {
    positionVoiceWave();
    resizeVoiceGlowCanvas();
  }
}

function initLayoutObserver() {
  if (!window.ResizeObserver) return;

  const layoutObserver = new ResizeObserver(() => {
    if (isVoiceWaveActive()) positionVoiceWave();
  });
  layoutObserver.observe(heading);
  layoutObserver.observe(chatArea);
  layoutObserver.observe(content);
}

/* ------------------------------------------------------------------ */
/* Event bindings & init                                              */
/* ------------------------------------------------------------------ */

function init() {
  input.addEventListener("input", handleInput);
  input.addEventListener("keydown", handleKeydown);
  input.addEventListener("focus", updatePlaceholderVisibility);
  input.addEventListener("blur", () => {
    updatePlaceholderVisibility();
    handleChatInputBlur();
  });
  chatForm.addEventListener("submit", handleSubmit);
  micBtn.addEventListener("click", handleMicClick);
  historyToggle.addEventListener("click", toggleHistoryPanel);
  newChatBtn.addEventListener("click", startNewChat);
  historyBackdrop.addEventListener("click", closeHistoryPanel);
  historyList.addEventListener("click", handleHistoryListClick);
  document.addEventListener("keydown", handleHistoryKeydown);
  window.addEventListener("resize", handleResize);

  applyLayoutFromQuery();
  renderHistoryList();
  scheduleTypingTick(500);
  initLayoutObserver();
  initScopeBar();
  initEmbeddedEscape();
}

/* Hosts embed this page in a frame and pick a fit: demo 2's drawer is
   narrower than demo 1's modal, so it asks for the compact chat box. */
function applyLayoutFromQuery() {
  const layout = new URLSearchParams(window.location.search).get("layout");
  if (layout === "compact") page.classList.add("is-compact");

  // In a frame the viewport units resolve a little taller than the frame
  // itself, which leaves the document scrolling behind the panel. The
  // message list does its own scrolling, so pin the page to the frame.
  if (window.parent !== window) {
    document.documentElement.classList.add("is-embedded");
  }
}

/* ------------------------------------------------------------------ */
/* Scope bar — the notch tucked behind the top of the chat box         */
/* ------------------------------------------------------------------ */

const SCOPE_ICONS = {
  folder:
    "M3.5 6.5a2 2 0 0 1 2-2h3.4l1.8 2h7.8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z",
  building:
    "M4 20V5.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 14 5.5V20M14 10h4.5A1.5 1.5 0 0 1 20 11.5V20M2.5 20h19M7 8h4M7 12h4M7 16h4M17 14h1M17 17h1",
  calendar:
    "M4.5 7.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2zM4.5 10h15M9 3.5v4M15 3.5v4",
};

const SCOPE_PICKERS = [
  {
    id: "level",
    icon: "folder",
    searchLabel: "Search levels",
    emptyLabel: "No level matches that.",
    selected: "Building Level",
    options: [
      { name: "All Levels", meta: "everything" },
      { name: "Building Level", meta: "per building" },
      { name: "Floor Level", meta: "per floor" },
      { name: "Zone Level", meta: "per zone" },
      { name: "Room Level", meta: "per room" },
      { name: "Asset Level", meta: "per device" },
    ],
  },
  {
    id: "site",
    icon: "building",
    searchLabel: "Search sites",
    emptyLabel: "No site matches that.",
    selected: "Riyadh HQ",
    options: [
      { name: "All Sites", meta: "portfolio" },
      { name: "Riyadh HQ", meta: "12 floors" },
      { name: "Jeddah Tower", meta: "28 floors" },
      { name: "Dammam Plant", meta: "4 blocks" },
      { name: "Neom Campus", meta: "6 buildings" },
    ],
  },
  {
    id: "period",
    icon: "calendar",
    searchLabel: "Search ranges",
    emptyLabel: "No range matches that.",
    selected: "Last 30 days",
    options: [
      { name: "Today", meta: "live" },
      { name: "Last 7 days", meta: "week" },
      { name: "Last 30 days", meta: "month" },
      { name: "Last quarter", meta: "90 days" },
      { name: "Year to date", meta: "2026" },
    ],
  },
];

let scopeIsOpen = false;

function initScopeBar() {
  const bar = document.getElementById("scope-bar");
  if (!bar) return;

  const icon = (name, cls) =>
    `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${SCOPE_ICONS[name]}"/></svg>`;

  /*
   * One menu for all three selectors, parked on <body>. It has to live
   * outside .chat-area: that element opens a stacking context below the
   * heading and clips its overflow once the chat is active, so a menu
   * nested inside it renders behind the page and gets cut off.
   */
  const menu = document.createElement("div");
  menu.className = "scope__menu";
  menu.id = "scope-menu";
  menu.hidden = true;
  menu.innerHTML = `
    <div class="scope__search">
      <svg class="scope__search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>
      </svg>
      <input type="text" class="scope__search-input" autocomplete="off" />
    </div>
    <ul class="scope__list" role="listbox"></ul>
    <p class="scope__empty" hidden></p>`;
  document.body.appendChild(menu);

  const search = menu.querySelector(".scope__search-input");
  const list = menu.querySelector(".scope__list");
  const empty = menu.querySelector(".scope__empty");

  let current = null;
  let activeIndex = 0;
  let shown = [];

  const render = () => {
    const q = search.value.trim().toLowerCase();
    shown = current.options.filter((o) =>
      `${o.name} ${o.meta}`.toLowerCase().includes(q),
    );

    list.replaceChildren(
      ...shown.map((option, i) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "scope__option";
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", String(option.name === current.selected));
        if (i === activeIndex) btn.classList.add("is-active");
        btn.innerHTML = `${icon(current.icon, "scope__option-icon")}
          <span class="scope__option-name"></span>
          <span class="scope__option-meta"></span>`;
        btn.querySelector(".scope__option-name").textContent = option.name;
        btn.querySelector(".scope__option-meta").textContent = option.meta;
        btn.addEventListener("click", () => choose(option.name));
        li.append(btn);
        return li;
      }),
    );

    empty.hidden = shown.length > 0;
    empty.textContent = current.emptyLabel;
  };

  // Fixed positioning, so the coordinates are written each time it opens.
  const place = () => {
    const rect = current.button.getBoundingClientRect();
    menu.style.left = `${Math.max(8, rect.left)}px`;
    menu.style.bottom = `${window.innerHeight - rect.top + 8}px`;

    // In a short embed there may not be room for the full list above the
    // bar. Cap the menu so the search field stays on screen and let the
    // list take whatever height is left.
    menu.style.maxHeight = `${Math.max(120, rect.top - 16)}px`;

    const spill = menu.getBoundingClientRect().right - window.innerWidth + 8;
    if (spill > 0) menu.style.left = `${Math.max(8, rect.left - spill)}px`;
  };

  const open = (picker) => {
    current = picker;
    scopeIsOpen = true;
    activeIndex = Math.max(
      0,
      picker.options.findIndex((o) => o.name === picker.selected),
    );
    search.value = "";
    search.placeholder = picker.searchLabel;
    search.setAttribute("aria-label", picker.searchLabel);
    render();
    menu.hidden = false;
    place();
    for (const p of SCOPE_PICKERS) {
      p.button.setAttribute("aria-expanded", String(p === picker));
    }
    search.focus();
  };

  const close = ({ refocus = false } = {}) => {
    if (!scopeIsOpen) return;
    const button = current?.button;
    scopeIsOpen = false;
    menu.hidden = true;
    for (const p of SCOPE_PICKERS) p.button.setAttribute("aria-expanded", "false");
    if (refocus) button?.focus();
  };

  const choose = (name) => {
    current.selected = name;
    current.label.textContent = name;
    close({ refocus: true });
  };

  const moveActive = (step) => {
    if (!shown.length) return;
    activeIndex = (activeIndex + step + shown.length) % shown.length;
    render();
    list.children[activeIndex]?.firstElementChild?.scrollIntoView({
      block: "nearest",
    });
  };

  for (const picker of SCOPE_PICKERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scope__item";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "scope-menu");
    button.innerHTML = `${icon(picker.icon, "scope__item-icon")}<span class="scope__item-label"></span>`;
    const label = button.querySelector(".scope__item-label");
    label.textContent = picker.selected;

    picker.button = button;
    picker.label = label;

    button.addEventListener("click", () => {
      if (scopeIsOpen && current === picker) close();
      else open(picker);
    });

    bar.append(button);
  }

  search.addEventListener("input", () => {
    activeIndex = 0;
    render();
  });

  menu.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (shown[activeIndex]) choose(shown[activeIndex].name);
    }
  });

  // Capture, and stopImmediate: the other Escape handlers sit on this same
  // node, so plain stopPropagation would not hold them back.
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && scopeIsOpen) {
        event.stopImmediatePropagation();
        close({ refocus: true });
      }
    },
    true,
  );

  document.addEventListener("pointerdown", (event) => {
    if (!scopeIsOpen) return;
    const onTrigger = SCOPE_PICKERS.some((p) => p.button.contains(event.target));
    if (!menu.contains(event.target) && !onTrigger) close();
  });

  window.addEventListener("resize", () => {
    if (scopeIsOpen) place();
  });
}

init();
