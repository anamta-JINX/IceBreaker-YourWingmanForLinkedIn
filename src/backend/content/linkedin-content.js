(() => {
  const CONTENT_SCRIPT_VERSION = '1.4.90';
  if (window.__ICEBREAKER_CONTENT_VERSION__ === CONTENT_SCRIPT_VERSION) return;

  // Older IceBreaker builds used a boolean guard, which meant Chrome could
  // keep the stale conversation detector alive after an extension reload.
  // Version the injected script instead so the service worker can install the
  // repaired detector into an already-open LinkedIn tab.
  try { window.__ICEBREAKER_CONTENT_ABORT__?.abort(); } catch (_) {}
  try { window.__ICEBREAKER_CONTENT_OBSERVER__?.disconnect(); } catch (_) {}
  const contentAbortController = new AbortController();
  window.__ICEBREAKER_CONTENT_ABORT__ = contentAbortController;
  window.__ICEBREAKER_CONTENT_VERSION__ = CONTENT_SCRIPT_VERSION;
  window.__ICEBREAKER_CONTENT_LOADED__ = true;

  const PROFILE_LINK_SELECTOR = 'a[href*="linkedin.com/in/"], a[href^="/in/"], a[href*="/in/"]';
  const PROFILE_CARD_SELECTORS = [
    '.mn-connection-card',
    '.mn-connection-card__container',
    '[data-view-name="connections-list-item"]',
    '[data-view-name="connections-card"]',
    '[data-view-name*="connection-card"]',
    '[data-chameleon-result-urn]',
    '.reusable-search__result-container',
    '.entity-result',
    'li.artdeco-list__item',
    '[role="listitem"]',
    '.artdeco-card',
    'li'
  ];
  const COMMENT_ITEM_SELECTORS = [
    '.comments-comment-item',
    '.comments-comments-list__comment-item',
    '.comments-comment-entity',
    '[data-view-name="comment-item"]',
    '[data-view-name*="comment-item"]',
    '[data-testid*="comment-item" i]',
    '[data-id*="comment" i][role="article"]'
  ];
  const POST_SELECTORS = [
    '[data-urn^="urn:li:activity"]',
    '[data-urn*="urn:li:activity"]',
    '[data-id*="urn:li:activity"]',
    '[data-view-name="feed-full-update"]',
    '[data-view-name="feed-update"]',
    '.feed-shared-update-v2',
    '.occludable-update',
    'article'
  ];
  const CONVERSATION_MESSAGE_SELECTORS = [
    '.msg-s-event-listitem',
    '.msg-s-message-list__event',
    '.msg-s-event-listitem__body',
    '.msg-s-message-list__message-bubble',
    '.msg-s-event-listitem__message-bubble',
    '.msg-s-message-group',
    '[data-event-urn]',
    '[data-view-name="message-list-item"]',
    '[data-view-name*="message-list-item"]',
    '[data-view-name*="message-event"]',
    '[data-view-name*="message-body"]',
    '[data-view-name*="message-bubble"]',
    '[data-view-name*="conversation-message"]',
    '[data-testid*="message-bubble" i]',
    '[data-testid*="message-body" i]',
    '[class*="message-bubble"]',
    '[class*="messageBubble"]',
    '[role="article"][aria-label*="message" i]'
  ];
  const CONVERSATION_COMPOSER_SELECTORS = [
    '.msg-form [contenteditable="true"]',
    '.msg-form textarea',
    '.msg-compose-form [contenteditable="true"]',
    '[data-view-name*="message-composer"] [contenteditable="true"]',
    '[data-testid*="message-composer" i] [contenteditable="true"]',
    '[data-testid*="composer" i] [contenteditable="true"]',
    '[data-view-name*="composer"] [contenteditable="true"]',
    '[aria-label*="write a message" i][contenteditable="true"]',
    '[aria-label*="type a message" i][contenteditable="true"]',
    '[aria-label*="reply" i][contenteditable="true"]',
    '[contenteditable="true"][role="textbox"]',
    'textarea[placeholder*="message" i]'
  ];
  const CONVERSATION_ROW_SELECTORS = [
    '.msg-conversation-listitem',
    '.msg-conversation-card',
    '.msg-conversations-container__convo-item',
    '[data-view-name="conversation-list-item"]',
    '[data-view-name*="conversation-list"]',
    '[data-testid*="conversation" i]',
    '[data-control-name*="conversation"]',
    '[aria-label*="conversation with" i]',
    'a[href*="/messaging/thread/"]',
    '[role="listitem"]'
  ];
  const STRICT_CONVERSATION_SHELL_SELECTORS = [
    '.msg-overlay-conversation-bubble',
    '.msg-convo-wrapper',
    '.msg-thread',
    '.msg-thread__wrapper',
    '[data-view-name="conversation-detail"]',
    '[data-view-name*="conversation-detail"]',
    '[data-testid*="conversation-thread" i]',
    '[aria-label*="conversation with" i]',
    '[aria-label*="messages with" i]',
    '[aria-label*="messaging with" i]',
    '[aria-label*="chat with" i]'
  ];
  const CONVERSATION_MESSAGE_LIST_SELECTORS = [
    '.msg-s-message-list',
    '.msg-s-message-list__scrollable',
    '.msg-s-message-list__container',
    '.msg-s-message-list-container',
    '.msg-s-message-list-content',
    '.msg-thread__messages',
    '[data-view-name="message-list"]',
    '[data-view-name="message-list-container"]',
    '[data-view-name*="message-list"]',
    '[data-view-name*="message-thread"]',
    '[data-testid*="message-thread" i]',
    '[role="log"]'
  ];
  const MIN_CONVERSATION_MESSAGES = 3;
  const MAX_CONVERSATION_MESSAGES = 8;

  const CONVERSATION_DIAGNOSTICS = Object.freeze({
    'E-RPL-01': 'LinkedIn Messaging is not open or no supported messaging surface is visible.',
    'E-RPL-02': 'No active conversation row or readable message thread could be located.',
    'E-RPL-03': 'A conversation thread was found, but it did not contain readable message text.',
    'E-RPL-04': 'The visible thread did not match the conversation that IceBreaker was asked to read.',
    'E-RPL-05': 'IceBreaker could not reliably determine who sent the newest visible message.',
    'E-RPL-06': 'Conversation capture was cancelled because the mode, page, or selected thread changed.',
    'E-RPL-07': 'The LinkedIn content script is stale or not installed in the current tab.',
    'E-RPL-08': 'LinkedIn did not finish opening the selected conversation before the capture timeout.',
    'E-RPL-09': 'The captured conversation could not be delivered to the IceBreaker generator.',
    'E-RPL-10': 'Only an inbox preview was available, so the full visible thread could not be confirmed.',
    'E-RPL-11': 'The pointer is outside a supported LinkedIn conversation row, message thread, or message composer.',
    'E-RPL-12': 'A candidate conversation root also contained feed or comment content and was rejected as contaminated.',
    'E-RPL-13': 'A stale hovered conversation target was replaced by the currently active LinkedIn thread.',
    'E-RPL-14': 'The active inbox row and visible message thread identified different participants.',
    'E-RPL-15': 'More than one visible conversation thread matched and IceBreaker could not select one safely.',
    'E-RPL-16': 'No readable local conversation shell was available. IceBreaker refused to read unrelated page content.'
  });

  const AUTOPILOT_DIAGNOSTICS = Object.freeze({
    'AP-W001': 'LinkedIn did not load any additional connection cards after repeated scroll and load-more attempts.',
    'AP-W002': 'The message draft was saved, but the résumé attachment could not be confirmed. Autopilot continued to the next connection.',
    'AP-W003': 'A legacy direct-compose attempt was ignored. Autopilot now uses only the visible same-page LinkedIn composer.',
    'AP-S101': 'The card could not be verified as a 1st-degree connection.',
    'AP-S102': 'A draft was already prepared for this person in an earlier Autopilot run.',
    'AP-S103': 'This connection did not match the selected Autopilot contact mode or filters.',
    'AP-S104': 'A relevant phrase was found, but its confidence was below the selected threshold.',
    'AP-S105': 'The configured maximum number of drafts for this company was reached.',
    'AP-S106': 'A relevant contact was detected, but LinkedIn did not expose a supported Message action for that card.',
    'AP-S107': 'An existing LinkedIn conversation was found and the skip-existing-conversation setting is enabled.',
    'AP-S108': 'Existing text was found in the message composer and overwrite protection is enabled.',
    'AP-E201': 'The selected AI provider did not return a usable IceBreaker message.',
    'AP-E202': 'LinkedIn did not open a supported message composer.',
    'AP-E203': 'The visible composer recipient did not match the selected connection.',
    'AP-E204': 'The LinkedIn message editor could not be found inside the opened composer.',
    'AP-E205': 'The generated message could not be inserted or preserved in the editor.',
    'AP-E206': 'The saved résumé file is missing or no longer attachable.',
    'AP-E207': 'The résumé attachment workflow failed before LinkedIn confirmed the file.',
    'AP-E208': 'The completed draft could not be verified after insertion and attachment.',
    'AP-E209': 'LinkedIn appears to be rate-limiting, blocking, or delaying the requested action.',
    'AP-E210': 'LinkedIn changed the card or composer structure used by this Autopilot build.',
    'AP-E211': 'LinkedIn did not expose a usable file input for the résumé attachment.',
    'AP-E212': 'The saved résumé could not be placed into LinkedIn’s file input.',
    'AP-E213': 'LinkedIn received the résumé file but did not confirm that its upload completed.',
    'AP-E214': 'The message was inserted, but LinkedIn did not preserve it as a stable draft.',
    'AP-E215': 'A message composer opened, but it belonged to a different or stale conversation.',
    'AP-E216': 'The selected Message action became stale before LinkedIn could open the composer.',
    'AP-E217': 'All supported Message-action activation methods were attempted, but no usable composer appeared.',
    'AP-E218': 'A legacy direct-compose route was unavailable. Same-page Autopilot does not use this route.',
    'AP-E301': 'Autopilot reached the configured consecutive-error safety limit.',
    'AP-E900': 'The extension could not communicate with the LinkedIn content script.',
    'AP-E999': 'An unexpected Autopilot error occurred.'
  });

  let hoverTimer = null;
  let lastSignature = '';
  let currentTarget = null;
  let hoverDelay = 850;
  let generationMode = 'dms';
  let currentUserName = '';
  let badge = null;
  let lastUrl = location.href;
  let conversationCaptureToken = 0;
  let lastConversationDispatchAt = 0;
  let lastConversationDispatchSignature = '';
  let lastConversationDiagnosticCode = '';
  let lastConversationDiagnosticAt = 0;
  let autopilotController = null;
  let lastAutopilotStartPoint = null;
  let lastPointerElement = null;
  let lastPointerPosition = { x: 0, y: 0, at: 0 };
  let lastConversationTarget = null;
  let panelActive = false;

  initialize();

  async function initialize() {
    await refreshPublicSettings();
    const signal = contentAbortController.signal;
    document.addEventListener('pointerover', handlePointerOver, { capture: true, signal });
    document.addEventListener('pointerout', handlePointerOut, { capture: true, signal });
    document.addEventListener('pointermove', rememberPointerPosition, { capture: true, passive: true, signal });

    try {
      if (window.__ICEBREAKER_RUNTIME_HANDLER__) {
        chrome.runtime.onMessage.removeListener(window.__ICEBREAKER_RUNTIME_HANDLER__);
      }
    } catch (_) {}
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    window.__ICEBREAKER_RUNTIME_HANDLER__ = handleRuntimeMessage;

    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastSignature = '';
        currentTarget = null;
        lastConversationDispatchAt = 0;
        lastConversationDispatchSignature = '';
        lastConversationDiagnosticCode = '';
        lastConversationDiagnosticAt = 0;
        conversationCaptureToken += 1;
        lastConversationTarget = null;
        lastAutopilotStartPoint = null;
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.__ICEBREAKER_CONTENT_OBSERVER__ = observer;
  }

  async function refreshPublicSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_PUBLIC_SETTINGS' });
      if (response?.hoverDelay) hoverDelay = Number(response.hoverDelay) || 850;
      generationMode = normalizeMode(response?.generationMode);
      panelActive = response?.panelActive === true;
      currentUserName = normalizeName(response?.senderName || currentUserName || detectCurrentLinkedInUserName());
    } catch (_) {}
  }

  function normalizeMode(value) {
    return ['dms', 'comments', 'conversation'].includes(value) ? value : 'dms';
  }

  function handlePointerOver(event) {
    if (!panelActive) return;
    rememberPointerPosition(event);
    lastPointerElement = event.target;
    if (autopilotController && ['starting', 'running', 'paused'].includes(autopilotController.status)) return;

    // Alt+S must work regardless of the manual DMs / Comments / Conversation mode.
    const autopilotHover = resolveProfileTarget(event.target);
    if (autopilotHover) {
      const profile = extractProfileFromCard(autopilotHover.link, autopilotHover.container);
      const profileId = autopilotProfileId(profile);
      if (profileId) {
        lastAutopilotStartPoint = {
          profileId,
          profileName: profile.name || '',
          profileUrl: profile.url || '',
          container: autopilotHover.container,
          link: autopilotHover.link,
          capturedAt: Date.now()
        };
      }
    }

    const resolved = generationMode === 'comments'
      ? resolveCommentOrPostTarget(event.target)
      : generationMode === 'conversation'
        ? resolveConversationTarget(event.target)
        : resolveDmTarget(event.target);
    if (!resolved) {
      if (
        generationMode === 'conversation' &&
        currentTarget?.type === 'conversation' &&
        !isConversationUiTarget(event.target)
      ) {
        clearTimeout(hoverTimer);
        currentTarget = null;
        lastConversationTarget = null;
      }
      return;
    }

    const targetKey = `${generationMode}|${resolved.key}`;

    if (currentTarget?.container === resolved.container && currentTarget?.targetKey === targetKey) return;

    currentTarget = { ...resolved, targetKey, mode: generationMode };
    if (generationMode === 'conversation') rememberConversationTarget(currentTarget);
    clearTimeout(hoverTimer);
    const effectiveDelay = generationMode === 'conversation' ? Math.min(320, hoverDelay) : hoverDelay;
    const scheduledTarget = currentTarget;
    hoverTimer = setTimeout(() => captureHoveredContext(scheduledTarget), effectiveDelay);
  }

  function handlePointerOut(event) {
    rememberPointerPosition(event);
    lastPointerElement = event.relatedTarget || null;
    if (!currentTarget) return;
    const next = event.relatedTarget;
    if (next && currentTarget.container?.contains(next)) return;

    clearTimeout(hoverTimer);
    currentTarget = null;
  }

  function rememberConversationTarget(target) {
    if (!target || target.type !== 'conversation') return;
    const row = target.row?.isConnected ? target.row : null;
    const shell = target.threadRoot?.isConnected
      ? findConversationRootFromTarget(target.threadRoot)
      : (target.container?.isConnected ? findConversationRootFromTarget(target.container) : null);
    lastConversationTarget = {
      row,
      shell,
      expectedName: conversationParticipantName(shell, row) || '',
      capturedAt: Date.now()
    };
  }

  function recentConversationTarget(maxAgeMs = 15000) {
    if (!lastConversationTarget || Date.now() - Number(lastConversationTarget.capturedAt || 0) > maxAgeMs) return null;
    const row = lastConversationTarget.row?.isConnected ? lastConversationTarget.row : null;
    const shell = lastConversationTarget.shell?.isConnected
      ? findConversationRootFromTarget(lastConversationTarget.shell)
      : null;
    if (!row && !shell && !lastConversationTarget.expectedName) return null;
    return { ...lastConversationTarget, row, shell };
  }

  function rememberPointerPosition(event) {
    if (!Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) return;
    lastPointerPosition = { x: event.clientX, y: event.clientY, at: Date.now() };
  }

  function resolveProfileTarget(target) {
    const directLink = target.closest?.(PROFILE_LINK_SELECTOR);
    if (directLink && isUsableProfileLink(directLink)) {
      const card = findProfileCard(directLink);
      return card ? {
        type: 'profile',
        link: directLink,
        container: card,
        key: `${normalizeLinkedInUrl(directLink.href || directLink.getAttribute('href') || '')}|${clean(directLink.innerText)}`
      } : null;
    }

    for (const selector of PROFILE_CARD_SELECTORS) {
      const card = target.closest?.(selector);
      if (!card) continue;
      const link = card.querySelector(PROFILE_LINK_SELECTOR);
      if (link && isUsableProfileLink(link)) {
        return {
          type: 'profile',
          link,
          container: card,
          key: `${normalizeLinkedInUrl(link.href || link.getAttribute('href') || '')}|${clean(link.innerText)}`
        };
      }
    }
    return null;
  }

  function resolveDmTarget(target) {
    const comment = findCommentContainer(target);
    if (comment) {
      const authorLink = findCommentAuthorLink(comment);
      if (!authorLink || !isUsableProfileLink(authorLink)) return null;

      // A profile mention inside somebody else's comment must never become the
      // DM recipient. When the pointer is directly over a profile link, accept
      // it only when it is the verified author link for this comment.
      const directLink = target.closest?.(PROFILE_LINK_SELECTOR);
      if (directLink && !sameLinkedInProfile(directLink, authorLink)) return null;

      const body = extractCommentBody(comment);
      const id = comment.getAttribute('data-id') || comment.getAttribute('data-urn') || comment.dataset?.id || '';
      const profileUrl = normalizeLinkedInUrl(authorLink.href || authorLink.getAttribute('href') || '');
      return {
        type: 'dm-comment',
        link: authorLink,
        container: comment,
        commentContainer: comment,
        key: `${profileUrl}|${id}|${body.slice(0, 520)}`
      };
    }

    const post = findPostContainer(target);
    if (post && isConfirmedFeedPost(post)) {
      const directLink = target.closest?.(PROFILE_LINK_SELECTOR);
      const authorLink = findPostAuthorLink(post);
      if (directLink && authorLink && sameLinkedInProfile(directLink, authorLink) && !isReactionOrSocialProofNode(directLink)) {
        const postBody = extractPostBody(post);
        const profileUrl = normalizeLinkedInUrl(authorLink.href || authorLink.getAttribute('href') || '');
        const urn = post.getAttribute('data-urn') || post.getAttribute('data-id') || post.dataset?.urn || '';
        return {
          type: 'dm-post',
          link: authorLink,
          container: post,
          postContainer: post,
          key: `${profileUrl}|${urn}|${postBody.slice(0, 520)}`
        };
      }

      // A feed card may contain mentions, reaction/social-proof names and
      // suggested profiles. In DM mode, enrich only a direct hover over the
      // verified post author; never let a generic card fallback pick somebody
      // else from the same post.
      return null;
    }

    return resolveProfileTarget(target);
  }

  function findCommentAuthorLink(comment) {
    if (!comment?.querySelector) return null;
    const selectors = [
      'a.comments-comment-meta__description-title[href*="/in/"]',
      '.comments-comment-meta__description-title > a[href*="/in/"]',
      '.comments-comment-meta__description-title a[href*="/in/"]',
      'a.comments-comment-meta__actor-link[href*="/in/"]',
      '.comments-comment-meta__description-container a[href*="/in/"]',
      '.comments-post-meta__actor-link[href*="/in/"]',
      '[data-view-name*="comment-author" i] a[href*="/in/"]',
      '[data-view-name*="comment-meta" i] a[href*="/in/"]',
      'a[data-view-name*="comment-author" i][href*="/in/"]'
    ];
    for (const selector of selectors) {
      const link = comment.querySelector(selector);
      if (link && isUsableProfileLink(link) && !isInvalidCommentActorLink(link)) return link;
    }

    const bodyNode = comment.querySelector([
      '.comments-comment-item__main-content',
      '.comments-comment-item-content-body',
      '.comments-comment-item__comment-text',
      '.comments-comment-entity__content',
      '[data-view-name="comment-content"]',
      '[data-view-name*="comment-text"]'
    ].join(','));
    const candidates = [...comment.querySelectorAll(PROFILE_LINK_SELECTOR)]
      .filter((link) => isUsableProfileLink(link) && !isInvalidCommentActorLink(link))
      .filter((link) => !bodyNode || !bodyNode.contains(link));
    return candidates[0] || null;
  }

  function isInvalidCommentActorLink(link) {
    return Boolean(link?.closest?.([
      '.social-details-social-counts',
      '.social-details-reactors-tab-body',
      '.reactions-menu',
      '.comments-comment-social-bar',
      '[class*="social-proof" i]',
      '[class*="reaction" i]',
      '[data-view-name*="reaction" i]',
      '[aria-label*="reaction" i]',
      '[aria-label*="liked by" i]'
    ].join(',')));
  }

  function sameLinkedInProfile(left, right) {
    const leftUrl = normalizeLinkedInUrl(left?.href || left?.getAttribute?.('href') || left || '');
    const rightUrl = normalizeLinkedInUrl(right?.href || right?.getAttribute?.('href') || right || '');
    if (leftUrl && rightUrl) return leftUrl === rightUrl;

    const leftName = normalizeMatchValue(extractVisibleActorName(left?.closest?.('article, li, div') || left, left));
    const rightName = normalizeMatchValue(extractVisibleActorName(right?.closest?.('article, li, div') || right, right));
    return Boolean(leftName && rightName && leftName === rightName);
  }

  function resolveCommentOrPostTarget(target) {
    const comment = findCommentContainer(target);
    if (comment) {
      const body = extractCommentBody(comment);
      const id = comment.getAttribute('data-id') || comment.getAttribute('data-urn') || comment.dataset?.id || '';
      return { type: 'comment', container: comment, key: `${id}|${body.slice(0, 320)}` };
    }

    const post = findPostContainer(target);
    if (!post) return null;
    const body = extractPostBody(post);
    if (body.length < 12) return null;
    const urn = post.getAttribute('data-urn') || post.getAttribute('data-id') || post.dataset?.urn || '';
    return { type: 'post', container: post, key: `${urn}|${body.slice(0, 320)}` };
  }


  function resolveConversationTarget(target) {
    const shell = findConversationRootFromTarget(target);
    if (shell) {
      const transcript = extractConversationTranscript(shell);
      const isComposer = Boolean(closestMatching(target, CONVERSATION_COMPOSER_SELECTORS));
      if (!transcript && !isComposer) return null;
      return {
        type: 'conversation',
        container: shell,
        threadRoot: shell,
        row: null,
        needsOpen: false,
        key: conversationShellIdentity(shell)
      };
    }

    const row = findConversationRow(target);
    if (!row) return null;
    const rowText = extractConversationRowPreview(row);
    if (!rowText) return null;
    return {
      type: 'conversation',
      container: row,
      row,
      rowText,
      threadRoot: null,
      needsOpen: true,
      key: conversationRowIdentity(row)
    };
  }


  function isConversationUiTarget(target) {
    if (!target?.closest) return false;
    return Boolean(findConversationRootFromTarget(target) || findConversationRow(target));
  }


  function findCommentContainer(target) {
    const direct = closestMatching(target, COMMENT_ITEM_SELECTORS);
    if (direct && isLikelyComment(direct)) return direct;

    let node = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      if (node === document.body || node === document.documentElement) break;
      if (isLikelyComment(node)) return node;
    }
    return null;
  }

  function isLikelyComment(element) {
    if (!element || element.matches('.comments-comment-box, [contenteditable="true"], textarea')) return false;
    if (element.closest('.comments-comment-box, [data-view-name*="comment-composer"], form')) return false;
    const className = String(element.className || '');
    const metadata = clean([
      element.getAttribute?.('data-view-name'),
      element.getAttribute?.('data-testid'),
      element.getAttribute?.('data-id'),
      className
    ].filter(Boolean).join(' '));
    const hasCommentSignal = /comment-item|comments-comment-item|comment-entity|urn:li:comment/i.test(metadata);
    return hasCommentSignal && extractCommentBody(element).length >= 2;
  }

  function findPostContainer(target) {
    const direct = closestMatching(target, POST_SELECTORS);
    if (direct && isLikelyPost(direct)) return direct;

    let node = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
      if (node === document.body || node === document.documentElement) break;
      if (isLikelyPost(node)) return node;
    }
    return null;
  }

  function isLikelyPost(element) {
    if (!element || element.closest('.comments-comments-list, .feed-shared-update-v2__comments-container')) return false;
    const body = extractPostBody(element);
    if (body.length < 12) return false;
    return isConfirmedFeedPost(element) || element.tagName === 'ARTICLE';
  }

  function isConfirmedFeedPost(element) {
    if (!element) return false;
    const metadata = clean([
      element.getAttribute?.('data-urn'),
      element.getAttribute?.('data-id'),
      element.getAttribute?.('data-view-name'),
      element.getAttribute?.('data-testid'),
      String(element.className || '')
    ].filter(Boolean).join(' '));
    const hasActivityUrn = /urn:li:activity/i.test(metadata);
    const hasFeedSignal = /feed-full-update|feed-update|feed-shared-update|occludable-update|main-feed-activity/i.test(metadata);
    const hasPostActions = Boolean(element.querySelector(
      'button[aria-label*="Comment" i], button[aria-label*="Like" i], [data-control-name*="comment" i], [data-control-name*="like" i], .social-actions-button'
    ));
    return hasActivityUrn || hasFeedSignal || hasPostActions;
  }

  function isMessagingSurface() {
    if (/\/messaging(?:\/|$)/i.test(location.pathname)) return true;
    if (document.querySelector('.msg-overlay-conversation-bubble, .msg-convo-wrapper, [role="log"][aria-label*="message" i]')) return true;
    return [...document.querySelectorAll(CONVERSATION_COMPOSER_SELECTORS.join(','))]
      .some((composer) => isVisible(composer) && isLikelyMessagingComposer(composer));
  }

  function isLikelyMessagingComposer(composer) {
    if (!composer) return false;
    const metadata = clean([
      composer.getAttribute?.('aria-label'),
      composer.getAttribute?.('placeholder'),
      composer.getAttribute?.('data-placeholder'),
      composer.getAttribute?.('data-view-name'),
      composer.getAttribute?.('data-testid'),
      composer.closest?.('[aria-label]')?.getAttribute?.('aria-label'),
      composer.closest?.('[data-view-name]')?.getAttribute?.('data-view-name'),
      composer.closest?.('[data-testid]')?.getAttribute?.('data-testid'),
      String(composer.closest?.('form, [role="dialog"], section, aside, main')?.className || '')
    ].filter(Boolean).join(' '));
    if (/comment|post|search|headline/i.test(metadata)) return false;
    return /message|messaging|reply|conversation|inbox|chat|composer|msg-form|msg-convo|msg-overlay/i.test(metadata) ||
      Boolean(composer.closest?.('.msg-form, .msg-compose-form, .msg-overlay-conversation-bubble, .msg-convo-wrapper'));
  }

  function findConversationRow(target) {
    for (const selector of CONVERSATION_ROW_SELECTORS) {
      const candidate = target.closest?.(selector);
      if (!candidate) continue;
      const row = candidate.matches('a[href*="/messaging/thread/"]')
        ? candidate.closest('.msg-conversation-listitem, .msg-conversations-container__convo-item, [data-view-name="conversation-list-item"], [role="listitem"]') || candidate
        : candidate;
      if (isLikelyConversationRow(row)) return row;
    }
    return null;
  }

  function isLikelyConversationRow(row) {
    if (!row) return false;
    const className = String(row.className || '');
    const hasMessageClass = /msg-conversation|conversation-listitem|convo-item/i.test(className);
    const hasMessagingLink = Boolean(row.matches('a[href*="/messaging/"]') || row.querySelector('a[href*="/messaging/"]'));
    const hasConversationControl = /conversation/i.test(row.getAttribute('data-view-name') || row.getAttribute('data-control-name') || '');
    const text = extractConversationRowPreview(row);
    return text.length >= 3 && (hasMessageClass || hasMessagingLink || hasConversationControl);
  }

  function isConversationRowActive(row) {
    if (!row) return false;
    const explicitlyActive = row.matches('[aria-selected="true"], [aria-current="true"], .msg-conversation-listitem--is-active, .msg-conversation-listitem--active, .msg-conversations-container__convo-item--active, .active') ||
      Boolean(row.querySelector('[aria-selected="true"], [aria-current="true"]'));
    if (explicitlyActive) return true;

    const link = row.matches('a[href*="/messaging/"]') ? row : row.querySelector('a[href*="/messaging/"]');
    const rowUrl = normalizeLinkedInUrl(link?.href || link?.getAttribute?.('href') || '');
    const pageUrl = normalizeLinkedInUrl(location.href);
    return Boolean(rowUrl && pageUrl && (rowUrl === pageUrl || pageUrl.startsWith(`${rowUrl}/`) || rowUrl.startsWith(`${pageUrl}/`)));
  }

  function conversationRowIdentity(row) {
    const link = row?.matches('a[href*="/messaging/"]') ? row : row?.querySelector('a[href*="/messaging/"]');
    return normalizeLinkedInUrl(link?.href || '') || clean(row?.getAttribute('data-urn') || row?.getAttribute('data-id') || row?.innerText || '').slice(0, 260);
  }

  function extractConversationRowSnippet(row) {
    if (!row) return '';
    const explicit = firstText(row, [
      '.msg-conversation-card__message-snippet',
      '.msg-conversation-listitem__message-snippet',
      '.msg-conversation-card__message',
      '[data-view-name*="message-snippet"]',
      '[data-testid*="message-snippet" i]'
    ]);
    if (explicit) return clean(explicit);

    const name = canonicalPersonName(firstText(row, [
      '.msg-conversation-listitem__participant-names',
      '.msg-conversation-card__participant-names',
      '[data-anonymize="person-name"]',
      'h3',
      'strong'
    ]));
    const lines = clean(row.innerText || row.textContent || '')
      .split(/\n+/)
      .map(clean)
      .filter((line) => line && !/^(online|active now|sponsored|promoted|unread|read|seen|delivered|today|yesterday|focused|other|inmail|\d+[mhdw]|\d{1,2}:\d{2}(?:\s*[ap]m)?)$/i.test(line));
    return lines.find((line) => /^(?:you|me)\s*[:·-]/i.test(line)) ||
      lines.find((line) => canonicalPersonName(line) !== name && isLikelyConversationMessageText(line)) ||
      '';
  }

  function extractConversationRowPreview(row) {
    if (!row) return '';
    const name = firstText(row, [
      '.msg-conversation-listitem__participant-names',
      '.msg-conversation-card__participant-names',
      '[data-anonymize="person-name"]',
      'h3',
      'strong'
    ]);
    const preview = extractConversationRowSnippet(row);
    const fallback = clean(row.innerText || row.textContent || '')
      .split(/\n+/)
      .map(clean)
      .filter((line) => line && !/^(online|active now|sponsored|promoted|unread|read|seen|delivered|today|yesterday|\d+[mhdw])$/i.test(line))
      .slice(0, 6)
      .join('\n');
    return clean([name, preview].filter(Boolean).join('\n') || fallback).slice(0, 1400);
  }

  function closestMatching(target, selectors) {
    for (const selector of selectors) {
      const element = target.closest?.(selector);
      if (element) return element;
    }
    return null;
  }

  async function captureHoveredContext(target) {
    if (!panelActive || !target || target.mode !== generationMode) return;

    const isConversation = target.type === 'conversation';
    const captureToken = isConversation ? ++conversationCaptureToken : 0;

    try {
      let context = null;
      if (target.type === 'comment') {
        context = extractCommentContext(target.container);
      } else if (target.type === 'post') {
        context = extractPostContext(target.container);
      } else if (target.type === 'dm-comment' || target.type === 'dm-post') {
        context = extractDmContext(target);
      } else if (isConversation) {
        context = await prepareConversationContext(target, captureToken);
        if (captureToken !== conversationCaptureToken || generationMode !== 'conversation') return;
      } else {
        context = extractProfileFromCard(target.link, target.container);
      }

      if (!context?.name && !context?.description) {
        if (isConversation) await reportConversationDiagnostic(target.captureErrorCode || 'E-RPL-03', '', target.container);
        return;
      }

      const signature = contextSignature(context);
      if (signature === lastSignature) {
        showBadge(target.container, context.mode === 'conversation' ? 'Reply ready' : 'Ready');
        return;
      }

      // A LinkedIn thread can emit several DOM mutations while it settles. Do
      // not let nearly-identical conversation captures repeatedly cancel the
      // same provider request. A genuinely new final message creates a new
      // stable signature and is still generated automatically.
      if (
        context.mode === 'conversation' &&
        signature === lastConversationDispatchSignature &&
        Date.now() - lastConversationDispatchAt < 5000
      ) {
        showBadge(target.container, 'Reply ready');
        return;
      }

      lastSignature = signature;
      if (context.mode === 'conversation') {
        lastConversationDispatchSignature = signature;
        lastConversationDispatchAt = Date.now();
      }

      const writingLabel = generationMode === 'comments'
        ? 'Writing comment…'
        : generationMode === 'conversation'
          ? `Writing reply from ${context.messageCount || 'recent'} msgs…`
          : 'Generating DM…';
      showBadge(target.container, writingLabel);

      try {
        if (!panelActive) return;
        const response = await chrome.runtime.sendMessage({
          type: context.mode === 'conversation' ? 'CONVERSATION_HOVERED_GENERATE' : 'CONTEXT_HOVERED',
          context
        });
        if (response?.generated) showBadge(target.container, response.messageReady ? 'Reply ready' : 'Context read');
        if (!response?.ok || response?.error) {
          lastSignature = '';
          if (context.mode === 'conversation') {
            lastConversationDispatchSignature = '';
            await reportConversationDiagnostic(response?.errorCode || response?.code || 'E-RPL-09', response?.error || '', target.container);
          } else {
            showBadge(target.container, 'IceBreaker error');
          }
        }
      } catch (error) {
        lastSignature = '';
        if (context.mode === 'conversation') {
          lastConversationDispatchSignature = '';
          await reportConversationDiagnostic('E-RPL-09', error?.message || '', target.container);
        } else {
          showBadge(target.container, 'Open IceBreaker');
        }
      }
    } finally {
    }
  }


  async function prepareConversationContext(target, captureToken) {
    if (target.threadRoot && isSafeConversationRootCandidate(target.threadRoot)) {
      const direct = extractConversationContext(target.threadRoot, null);
      if (direct?.description) return direct;
      target.captureErrorCode = 'E-RPL-03';
      return null;
    }

    if (!target.row) {
      target.captureErrorCode = 'E-RPL-11';
      return null;
    }

    const previewContext = extractConversationPreviewContext(target.row);
    const expectedName = previewContext?.name || conversationParticipantName(null, target.row) || '';
    const previousShells = new Set(visibleConversationOuterShells());
    showBadge(target.container, 'Opening conversation…');
    openConversationRow(target.row);

    const shell = await waitForConversationThread({
      captureToken,
      expectedName,
      row: target.row,
      previousShells
    });
    if (captureToken !== conversationCaptureToken || generationMode !== 'conversation') return null;

    if (shell) {
      const fullContext = extractConversationContext(shell, target.row?.isConnected ? target.row : null);
      if (fullContext?.description) {
        target.threadRoot = shell;
        target.container = shell;
        target.needsOpen = false;
        rememberConversationTarget(target);
        return fullContext;
      }
      target.captureErrorCode = 'E-RPL-03';
    }

    if (previewContext?.description) {
      showBadge(target.container, 'Using latest preview…');
      return { ...previewContext, diagnosticCode: 'E-RPL-10', previewOnly: true };
    }

    target.captureErrorCode ||= 'E-RPL-08';
    return null;
  }


  function openConversationRow(row) {
    const clickable = row.matches('a, button')
      ? row
      : row.querySelector('a[href*="/messaging/"], button, [role="button"]') || row;
    try {
      clickable.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      clickable.focus?.({ preventScroll: true });
      clickable.click();
    } catch (_) {
      try {
        clickable.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
        clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        clickable.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
        row.click();
      } catch (_) {}
    }
  }

  async function waitForConversationThread({ captureToken, expectedName = '', row = null, previousShells = new Set() }) {
    for (let attempt = 0; attempt < 42; attempt += 1) {
      if (captureToken !== conversationCaptureToken || generationMode !== 'conversation') return null;
      const shells = visibleConversationOuterShells();
      const matching = expectedName
        ? shells.find((shell) => conversationRootMatchesExpected(shell, expectedName))
        : null;
      const newlyOpened = shells.find((shell) => !previousShells.has(shell));
      const candidate = matching || newlyOpened || (row?.isConnected && isConversationRowActive(row) && shells.length === 1 ? shells[0] : null);
      if (candidate && extractConversationTranscript(candidate)) return candidate;
      await sleep(120);
    }
    return null;
  }


  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function captureForShortcut() {
    if (generationMode === 'comments' && ['post', 'comment'].includes(currentTarget?.type) && currentTarget?.container) {
      showBadge(currentTarget.container, 'Generate + copy…');
      return currentTarget.type === 'comment'
        ? extractCommentContext(currentTarget.container)
        : extractPostContext(currentTarget.container);
    }

    if (generationMode === 'conversation') {
      const badgeContainer = currentTarget?.type === 'conversation' ? currentTarget.container : findConversationRootFromTarget(lastPointerElement);
      if (badgeContainer) showBadge(badgeContainer, 'Generate + copy…');
      return captureConversationContextNow({ allowPreview: true });
    }

    if (generationMode === 'dms' && currentTarget?.link && currentTarget?.container) {
      const profile = currentTarget.type === 'dm-comment' || currentTarget.type === 'dm-post'
        ? extractDmContext(currentTarget)
        : extractProfileFromCard(currentTarget.link, currentTarget.container);
      if (profile?.name) {
        showBadge(currentTarget.container, 'Generate + copy…');
        return profile;
      }
    }

    return captureCurrentContext();
  }

  function conversationDiagnosticMessage(code, detail = '') {
    const base = CONVERSATION_DIAGNOSTICS[code] || 'Conversation capture failed.';
    const suffix = clean(detail);
    return `[${code}] ${base}${suffix ? ` ${suffix}` : ''}`;
  }

  function conversationCaptureError(code, detail = '') {
    const error = new Error(conversationDiagnosticMessage(code, detail));
    error.code = code;
    return error;
  }

  function selectVisibleConversationShell(shells, options = {}) {
    const uniqueShells = shells.filter((shell, index, all) => shell && all.indexOf(shell) === index);
    if (!uniqueShells.length) return null;

    const directTargets = [
      options.pointerTarget,
      options.focusedTarget,
      options.currentShell,
      options.rememberedShell
    ];
    for (const target of directTargets) {
      if (!target) continue;
      const resolved = isSafeConversationRootCandidate(target)
        ? target
        : findConversationRootFromTarget(target);
      const match = uniqueShells.find((shell) => shell === resolved || shell.contains?.(resolved) || resolved?.contains?.(shell));
      if (match) return match;
    }

    const expectedName = clean(options.expectedName || '');
    if (expectedName) {
      const nameMatches = uniqueShells.filter((shell) => conversationRootMatchesExpected(shell, expectedName));
      if (nameMatches.length === 1) return nameMatches[0];
    }

    if (Date.now() - Number(lastPointerPosition.at || 0) < 5000) {
      try {
        const stack = document.elementsFromPoint(lastPointerPosition.x, lastPointerPosition.y);
        for (const element of stack) {
          const resolved = findConversationRootFromTarget(element);
          const match = uniqueShells.find((shell) => shell === resolved || shell.contains?.(resolved) || resolved?.contains?.(shell));
          if (match) return match;
        }
      } catch (_) {}
    }

    return uniqueShells.length === 1 ? uniqueShells[0] : null;
  }

  function extractUsableConversationContext(shell, row = null) {
    if (!shell || !isSafeConversationRootCandidate(shell)) return null;
    const matchedRow = row?.isConnected && conversationRootMatchesExpected(shell, conversationParticipantName(null, row))
      ? row
      : null;
    const context = extractConversationContext(shell, matchedRow);
    if (context?.description) {
      rememberConversationTarget({ type: 'conversation', threadRoot: shell, container: shell, row: matchedRow });
      return context;
    }
    return null;
  }

  function captureConversationContextNow({ allowPreview = true } = {}) {
    const pointerTarget = lastPointerElement?.isConnected ? lastPointerElement : null;
    const focusedTarget = document.activeElement?.isConnected ? document.activeElement : null;
    const remembered = recentConversationTarget();
    const currentShell = currentTarget?.type === 'conversation' && currentTarget.threadRoot?.isConnected
      ? findConversationRootFromTarget(currentTarget.threadRoot)
      : null;
    const pointerShell = pointerTarget ? findConversationRootFromTarget(pointerTarget) : null;
    const focusedShell = focusedTarget ? findConversationRootFromTarget(focusedTarget) : null;
    const rememberedShell = remembered?.shell || null;
    const selectedRow = currentTarget?.type === 'conversation' && currentTarget.row?.isConnected
      ? currentTarget.row
      : (remembered?.row?.isConnected ? remembered.row : findActiveConversationRow());
    const expectedName = conversationParticipantName(null, selectedRow) || remembered?.expectedName || '';
    const shell = pointerShell || focusedShell || currentShell || rememberedShell;

    if (shell) {
      const context = extractUsableConversationContext(shell, selectedRow);
      if (context?.description) return context;
    }

    const visibleShells = visibleConversationOuterShells();
    const visibleShell = selectVisibleConversationShell(visibleShells, {
      pointerTarget,
      focusedTarget,
      currentShell,
      rememberedShell,
      expectedName
    });
    if (visibleShell) {
      const context = extractUsableConversationContext(visibleShell, selectedRow);
      if (context?.description) return context;
      throw conversationCaptureError('E-RPL-03');
    }

    if (allowPreview && selectedRow) {
      const preview = extractConversationPreviewContext(selectedRow);
      if (preview?.description) return { ...preview, diagnosticCode: 'E-RPL-10', previewOnly: true };
    }

    if (visibleShells.length > 1) throw conversationCaptureError('E-RPL-15');
    if (!isMessagingSurface()) throw conversationCaptureError('E-RPL-01');
    throw conversationCaptureError('E-RPL-16');
  }


  async function reportConversationDiagnostic(code, detail = '', container = null) {
    const resolvedCode = CONVERSATION_DIAGNOSTICS[code] ? code : 'E-RPL-09';
    const message = conversationDiagnosticMessage(resolvedCode, detail);
    showBadge(container || currentTarget?.container || document.querySelector('main') || document.body, resolvedCode);
    const duplicate = resolvedCode === lastConversationDiagnosticCode && Date.now() - lastConversationDiagnosticAt < 5000;
    lastConversationDiagnosticCode = resolvedCode;
    lastConversationDiagnosticAt = Date.now();
    if (duplicate) return;
    try {
      await chrome.runtime.sendMessage({ type: 'CONVERSATION_CAPTURE_DIAGNOSTIC', code: resolvedCode, error: message });
    } catch (_) {}
  }

  function captureCurrentContext() {
    if (generationMode === 'conversation') {
      try {
        return captureConversationContextNow({ allowPreview: true });
      } catch (_) {
        return null;
      }
    }
    if (generationMode === 'comments') {
      if (currentTarget?.type === 'comment' && currentTarget?.container?.isConnected) return extractCommentContext(currentTarget.container);
      return extractVisiblePostContext();
    }
    if (generationMode === 'dms' && currentTarget?.container?.isConnected && currentTarget?.link?.isConnected) {
      if (currentTarget.type === 'dm-comment' || currentTarget.type === 'dm-post') return extractDmContext(currentTarget);
      if (currentTarget.type === 'profile') return extractProfileFromCard(currentTarget.link, currentTarget.container);
    }
    if (/\/in\//i.test(location.pathname)) return extractCurrentProfile();
    return null;
  }

  function isUsableProfileLink(link) {
    const href = link.getAttribute('href') || '';
    if (!/\/in\//i.test(href)) return false;
    if (link.closest('header, nav') && !link.closest('main')) return false;
    return true;
  }

  function findProfileCard(link) {
    if (!link) return null;
    const candidates = [];
    const added = new Set();
    const add = (node) => {
      if (!node || added.has(node) || !node.querySelector) return;
      const text = clean(node.innerText || node.textContent || '');
      if (text.length < 20 || text.length > 12000) return;
      if (!node.closest('main') && node !== document.querySelector('main')) return;
      added.add(node);
      candidates.push(node);
    };

    for (const selector of PROFILE_CARD_SELECTORS) add(link.closest(selector));
    let parent = link.parentElement;
    for (let depth = 0; parent && depth < 7; depth += 1, parent = parent.parentElement) add(parent);

    const profileHref = normalizeLinkedInUrl(link.href || link.getAttribute('href') || '');
    const scoreCard = (node) => {
      const links = [...node.querySelectorAll(PROFILE_LINK_SELECTOR)].filter(isUsableProfileLink);
      const uniqueProfiles = new Set(links.map((item) => normalizeLinkedInUrl(item.href || item.getAttribute('href') || '')).filter(Boolean));
      const text = clean(node.innerText || node.textContent || '');
      const controls = [...node.querySelectorAll('button, a[role="button"], a')];
      const hasMessage = controls.some((element) => /\bmessage\b/i.test(clean(`${element.innerText || ''} ${element.getAttribute?.('aria-label') || ''} ${element.getAttribute?.('title') || ''}`)));
      const containsTarget = !profileHref || links.some((item) => normalizeLinkedInUrl(item.href || item.getAttribute('href') || '') === profileHref);
      let score = containsTarget ? 40 : -100;
      if (node.matches('.mn-connection-card, .mn-connection-card__container, [data-view-name*="connection-card"], [data-view-name="connections-list-item"]')) score += 45;
      if (uniqueProfiles.size === 1) score += 35;
      else if (uniqueProfiles.size > 3) score -= uniqueProfiles.size * 18;
      if (hasMessage) score += 30;
      if (text.length <= 1200) score += 15;
      else if (text.length > 3500) score -= 25;
      return score;
    };

    return candidates.sort((a, b) => scoreCard(b) - scoreCard(a))[0] || link.parentElement;
  }

  function extractProfileNameFromLink(link, card) {
    const aria = clean(link?.getAttribute?.('aria-label') || '');
    const ariaMatch = aria.match(/(?:view|open|visit)\s+(.+?)(?:'s|’s)?\s+profile/i) || aria.match(/profile\s+of\s+(.+)/i);
    if (ariaMatch?.[1]) return clean(ariaMatch[1]);

    const linkTextCandidates = [
      link?.querySelector?.('.mn-connection-card__name'),
      link?.querySelector?.('.entity-result__title-text span[aria-hidden="true"]'),
      link?.querySelector?.('span[dir="ltr"] span[aria-hidden="true"]'),
      link?.querySelector?.('span[aria-hidden="true"]')
    ].map((node) => clean(node?.innerText || node?.textContent || '')).filter(Boolean);
    if (linkTextCandidates.length) return linkTextCandidates.sort((a, b) => a.length - b.length)[0];

    const firstLine = clean(link?.innerText || link?.textContent || '').split(/\n+/).map(clean).find(Boolean);
    if (firstLine && firstLine.length <= 120) return firstLine;

    return firstText(card, [
      '.mn-connection-card__name',
      '[data-view-name="connections-list-item"] [class*="name"]',
      '.entity-result__title-text span[aria-hidden="true"]',
      'span[dir="ltr"] span[aria-hidden="true"]',
      'a[href*="/in/"] span[aria-hidden="true"]'
    ]);
  }

  function inferConnectionHeadline(card, rawText, name) {
    const structured = firstText(card, [
      '.mn-connection-card__occupation',
      '.mn-connection-card__subtitle',
      '.mn-connection-card__details',
      '[data-view-name="connections-list-item"] [class*="occupation"]',
      '[data-view-name="connections-list-item"] [class*="headline"]',
      '[data-view-name="connections-list-item"] [class*="subtitle"]',
      '.entity-result__primary-subtitle',
      '.artdeco-entity-lockup__subtitle',
      '[data-anonymize="headline"]',
      '.t-14.t-black.t-normal'
    ]);
    if (structured && normalizeMatchValue(structured) !== normalizeMatchValue(name)) return structured;

    const ignored = new Set([
      normalizeMatchValue(name), 'message', 'connect', 'follow', 'pending', 'remove connection', 'more'
    ]);
    const lines = String(card?.innerText || rawText || '')
      .split(/\n+/)
      .map(clean)
      .filter(Boolean)
      .filter((line) => !ignored.has(normalizeMatchValue(line)))
      .filter((line) => !/^(\d+\s+)?mutual connections?$/i.test(line))
      .filter((line) => !/^view .*profile$/i.test(line))
      .filter((line) => !/^(?:connected|followed|invited|messaged)\s+(?:on\s+)?/i.test(line))
      .filter((line) => !/^(?:today|yesterday|\d+\s*(?:m|h|d|w|mo|yr)s?\s+ago)$/i.test(line))
      .filter((line) => !/^(?:show|see|view)\s+more$/i.test(line))
      .filter((line) => !/^\d+[,+]?\s+(?:followers?|connections?)$/i.test(line));
    return lines.find((line) => line.length >= 4 && line.length <= 300 && normalizeMatchValue(line) !== normalizeMatchValue(name)) || inferHeadline(rawText, name);
  }

  function extractProfileFromCard(link, card) {
    const rawText = clean(card.innerText || card.textContent || '').slice(0, 5000);
    const url = normalizeLinkedInUrl(link.href || link.getAttribute('href') || '');
    const name = extractProfileNameFromLink(link, card) || clean(link.getAttribute('aria-label')) || clean(link.innerText);
    const headline = inferConnectionHeadline(card, rawText, name);
    const locationText = firstText(card, [
      '.mn-connection-card__location',
      '[data-view-name="connections-list-item"] [class*="location"]',
      '.entity-result__secondary-subtitle',
      '.artdeco-entity-lockup__caption',
      '[data-anonymize="location"]',
      '.t-12.t-black--light'
    ]);
    const description = firstText(card, [
      '.entity-result__summary',
      '.entity-result__summary--2-lines',
      '.reusable-search-simple-insight',
      '.search-result__snippets',
      'p'
    ]) || inferDescription(rawText, name, headline, locationText);

    return {
      mode: 'dms',
      name: normalizeName(name),
      headline: clean(headline),
      company: inferCompany(headline),
      location: clean(locationText),
      description: clean(description).slice(0, 1600),
      rawText,
      url,
      source: 'profile-hover'
    };
  }

  function extractCurrentProfile() {
    const main = document.querySelector('main') || document.body;
    const topCard = main.querySelector('.pv-top-card, [data-view-name="profile-component-entity"], section') || main;
    const name = firstText(topCard, ['h1', '.text-heading-xlarge', '[data-anonymize="person-name"]']);
    const headline = firstText(topCard, [
      '.text-body-medium.break-words',
      '.pv-text-details__left-panel .text-body-medium',
      '[data-anonymize="headline"]'
    ]);
    const locationText = firstText(topCard, [
      '.text-body-small.inline.t-black--light.break-words',
      '.pv-text-details__left-panel .text-body-small',
      '[data-anonymize="location"]'
    ]);
    const aboutSection = [...main.querySelectorAll('section')].find((section) => {
      const heading = clean(section.querySelector('h2, h3')?.innerText).toLowerCase();
      return heading === 'about' || heading.startsWith('about ');
    });
    const description = clean(
      aboutSection?.querySelector('.inline-show-more-text, .display-flex.ph5.pv3, p')?.innerText ||
      aboutSection?.innerText || ''
    ).replace(/^About\s*/i, '').slice(0, 2200);
    const rawText = clean([topCard.innerText, aboutSection?.innerText || ''].join('\n')).slice(0, 6000);

    return {
      mode: 'dms',
      name: normalizeName(name),
      headline: clean(headline),
      company: inferCompany(headline),
      location: clean(locationText),
      description,
      rawText,
      url: normalizeLinkedInUrl(location.href),
      source: 'current-profile'
    };
  }

  async function captureSavedLinkedInProfile() {
    if (!/\/in\//i.test(location.pathname)) {
      throw new Error('Open a LinkedIn profile URL containing /in/.');
    }

    const originalY = window.scrollY;
    const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let step = 1; step <= 9; step += 1) {
      window.scrollTo(0, Math.round((maxScroll * step) / 9));
      await sleep(220);
    }
    window.scrollTo(0, originalY);
    await sleep(180);

    return extractSavedLinkedInProfile();
  }

  function extractSavedLinkedInProfile() {
    const main = document.querySelector('main') || document.body;
    const standard = extractCurrentProfile();
    const sections = [];
    const skipHeading = /^(activity|posts?|comments?|recent activity)$/i;
    const seen = new Set();

    for (const section of main.querySelectorAll('section')) {
      const heading = clean(section.querySelector('h1, h2, h3')?.innerText)
        .replace(/\bShow all.*$/i, '')
        .trim();
      if (!heading || skipHeading.test(heading) || /activity|posts? by /i.test(heading)) continue;
      if (section.matches('.pv-recent-activity-section, [data-view-name*="activity" i]') || section.querySelector('[data-urn*="urn:li:activity"], .feed-shared-update-v2, .occludable-update')) continue;

      const clone = section.cloneNode(true);
      clone.querySelectorAll([
        'button', 'svg', 'script', 'style', 'noscript', 'nav', 'form',
        '[data-urn*="urn:li:activity"]', '.feed-shared-update-v2', '.occludable-update',
        '.social-details-social-counts', '.social-actions-button', '.comments-comment-item'
      ].join(',')).forEach((node) => node.remove());
      let text = clean(clone.innerText)
        .replace(new RegExp(`^${escapeRegExp(heading)}\\s*`, 'i'), '')
        .replace(/\bShow all \d+ .*$/gim, '')
        .slice(0, 9000);
      if (text.length < 8) continue;
      const signature = `${heading.toLowerCase()}|${text.slice(0, 500).toLowerCase()}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      sections.push({ heading, text });
    }

    const topCard = main.querySelector('.pv-top-card, [data-view-name="profile-component-entity"]') || main.querySelector('section') || main;
    const topClone = topCard.cloneNode(true);
    topClone.querySelectorAll('button, svg, script, style, nav, form').forEach((node) => node.remove());
    const topText = clean(topClone.innerText).slice(0, 7000);
    const text = clean([
      standard.name ? `Name: ${standard.name}` : '',
      standard.headline ? `Headline: ${standard.headline}` : '',
      standard.location ? `Location: ${standard.location}` : '',
      topText ? `PROFILE OVERVIEW\n${topText}` : '',
      ...sections.map((section) => `${section.heading.toUpperCase()}\n${section.text}`)
    ].filter(Boolean).join('\n\n')).slice(0, 60000);

    const allowedDetailTypes = '(?:experience|education|certifications|skills|projects|courses|honors|recommendations|publications|volunteering|languages|organizations|patents|test-scores|interests)';
    const detailPattern = new RegExp(`/in/[^/]+/details/${allowedDetailTypes}/?`, 'i');
    const detailUrls = [...main.querySelectorAll('a[href]')]
      .map((link) => normalizeLinkedInUrl(link.href || link.getAttribute('href') || ''))
      .filter((url) => detailPattern.test(url) && !/recent-activity|posts?|comments?/i.test(url))
      .filter((url, index, list) => list.indexOf(url) === index)
      .slice(0, 14);

    return {
      ...standard,
      source: 'saved-linkedin-profile',
      sections,
      detailUrls,
      text,
      rawText: text,
      excludesPosts: true
    };
  }

  function extractVisiblePostContext() {
    const candidates = POST_SELECTORS.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const visible = candidates.find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > 80 && rect.top < window.innerHeight * 0.75 && extractPostBody(element).length >= 12;
    });
    return visible ? extractPostContext(visible) : null;
  }

  function extractPostContext(post) {
    const rawInnerText = String(post?.innerText || post?.textContent || '');
    const rawText = clean(rawInnerText).slice(0, 7000);
    const authorLink = findPostAuthorLink(post);
    const textActor = extractPostActorFromText(rawInnerText);
    const author = extractPostAuthorName(post, authorLink) || textActor.name;
    const headline = firstText(post, [
      '.update-components-actor__description',
      '.feed-shared-actor__description',
      '.update-components-actor__sub-description',
      '.feed-shared-actor__sub-description',
      '[data-view-name="feed-actor"] [data-anonymize="headline"]',
      '[data-view-name*="actor"] [data-anonymize="headline"]',
      '[data-anonymize="headline"]'
    ]) || textActor.headline;
    const body = extractPostBody(post);
    const permalink = post.querySelector('a[href*="/feed/update/"], a[href*="/posts/"], a[href*="activity-"]');

    const profileUrl = normalizeLinkedInUrl(authorLink?.href || '');
    const userId = (() => {
      try {
        return decodeURIComponent(new URL(profileUrl).pathname.match(/\/in\/([^/?#]+)/i)?.[1] || '');
      } catch (_) {
        return '';
      }
    })();

    return {
      mode: 'comments',
      name: author || 'LinkedIn post',
      authorName: author,
      contentType: 'post',
      headline: clean(headline) || 'Post author',
      company: inferCompany(headline),
      location: '',
      profileUrl,
      userId,
      description: body.slice(0, 3500),
      rawText,
      url: normalizeLinkedInUrl(permalink?.href || authorLink?.href || location.href),
      source: 'post-hover'
    };
  }


  function findPostAuthorLink(post) {
    if (!post?.querySelector) return null;
    const actorSelectors = [
      '.update-components-actor__meta-link[href*="/in/"]',
      '.update-components-actor__container-link[href*="/in/"]',
      '.update-components-actor__name a[href*="/in/"]',
      '.feed-shared-actor__container-link[href*="/in/"]',
      '.feed-shared-actor__meta a[href*="/in/"]',
      '.feed-shared-actor__name a[href*="/in/"]',
      '.comments-post-meta__actor-link[href*="/in/"]',
      '.comments-post-meta__name-text a[href*="/in/"]',
      '[data-view-name="feed-actor"] a[href*="/in/"]',
      '[data-view-name="feed-actor-name"] a[href*="/in/"]',
      'a[data-view-name="feed-actor-name"][href*="/in/"]',
      '[data-view-name*="actor"] a[href*="/in/"]',
      '[data-view-name*="author"] a[href*="/in/"]'
    ];
    for (const selector of actorSelectors) {
      const link = post.querySelector(selector);
      if (link && !isReactionOrSocialProofNode(link)) return link;
    }

    const bodyNode = post.querySelector([
      '.update-components-text',
      '.feed-shared-update-v2__description',
      '.feed-shared-inline-show-more-text',
      '[data-view-name="feed-commentary"]',
      '[data-view-name="feed-update-text"]'
    ].join(','));

    const ranked = [...post.querySelectorAll(PROFILE_LINK_SELECTOR)]
      .map((link, index) => {
        if (isReactionOrSocialProofNode(link)) return { link, score: -1000 };
        const metadata = clean([
          link.className,
          link.getAttribute?.('data-view-name'),
          link.getAttribute?.('data-testid'),
          link.closest?.('[data-view-name]')?.getAttribute?.('data-view-name'),
          String(link.closest?.('header, section, div, article')?.className || '')
        ].filter(Boolean).join(' '));
        const label = cleanPersonLabel(
          link.querySelector?.('[data-anonymize="person-name"]')?.textContent ||
          link.querySelector?.('span[aria-hidden="true"]')?.textContent ||
          link.getAttribute?.('aria-label') ||
          link.querySelector?.('img[alt]')?.getAttribute?.('alt') ||
          link.textContent || ''
        );
        let score = 0;
        if (/actor|author|post-meta|entity-lockup|update-components/i.test(metadata)) score += 100;
        if (link.querySelector?.('[data-anonymize="person-name"], span[aria-hidden="true"], img[alt]')) score += 25;
        if (label && !isReactionActorLabel(label)) score += 20;
        if (bodyNode && (link.compareDocumentPosition(bodyNode) & Node.DOCUMENT_POSITION_FOLLOWING)) score += 30;
        score -= index;
        return { link, score };
      })
      .filter(({ score }) => score > -500)
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.link || null;
  }

  function extractPostAuthorName(post, authorLink = null) {
    const structured = firstText(post, [
      '.update-components-actor__name span[aria-hidden="true"]',
      '.update-components-actor__title span[aria-hidden="true"]',
      '.update-components-actor__name',
      '.feed-shared-actor__name span[aria-hidden="true"]',
      '.feed-shared-actor__name',
      '.comments-post-meta__name-text span[aria-hidden="true"]',
      '[data-view-name="feed-actor"] [data-anonymize="person-name"]',
      '[data-view-name="feed-actor-name"] [data-anonymize="person-name"]',
      '[data-view-name*="actor"] [data-anonymize="person-name"]',
      '[data-view-name*="author"] [data-anonymize="person-name"]'
    ]);
    const labels = [
      structured,
      authorLink?.querySelector?.('[data-anonymize="person-name"]')?.textContent,
      authorLink?.querySelector?.('span[aria-hidden="true"]')?.textContent,
      authorLink?.getAttribute?.('aria-label'),
      authorLink?.querySelector?.('img[alt]')?.getAttribute?.('alt'),
      authorLink?.innerText
    ];
    for (const label of labels) {
      const cleaned = cleanPersonLabel(label || '')
        .replace(/['’]s\s+profile.*$/i, '')
        .replace(/^profile\s+of\s+/i, '')
        .replace(/^feed\s+post\s*/i, '')
        .replace(/^.*?(?:likes?|liked|reacted to|commented on|reposted|shared)\s+this\s*/i, '')
        .replace(/\s+(?:likes?|reacted to|celebrates?|supports?|loves?|finds this insightful).*$/i, '')
        .trim();
      if (isUsablePostOwnerName(cleaned)) return cleaned;
    }
    return '';
  }

  function extractPostActorFromText(value) {
    const raw = String(value || '').replace(/\u00a0/g, ' ');
    const compact = clean(raw.replace(/\n+/g, ' '));
    const lines = raw.split(/\n+/).map(clean).filter(Boolean);
    const candidates = [compact, ...lines];

    for (const source of candidates) {
      const matches = source.matchAll(/(.{1,180}?)\s*[•·]\s*(?:1st|2nd|3rd)(?=\s|[\p{Lu}]|$)([^\n]{0,320})/giu);
      for (const match of matches) {
        const name = normalizePostOwnerCandidate(match[1]);
        if (!isUsablePostOwnerName(name)) continue;
        const headline = normalizePostOwnerHeadline(match[2]);
        return { name, headline };
      }
    }

    return { name: '', headline: '' };
  }

  function normalizePostOwnerCandidate(value) {
    let text = clean(value)
      .replace(/^feed\s+post\s*/i, '')
      .replace(/^.*?(?:likes?|liked|reacted to|commented on|reposted|shared)\s+this\s*/i, '')
      .replace(/^.*?(?:likes?|liked|reacted to|commented on|reposted|shared)\s+(?:a|the)\s+post\s*/i, '')
      .replace(/^.*?\bfollows?\s+this\s*/i, '')
      .replace(/^(?:view|open)\s+/i, '')
      .trim();

    // When LinkedIn collapses several header fragments onto one line, retain
    // only the final plausible person-name segment immediately before the
    // connection-degree marker.
    const pieces = text.split(/(?:\s{2,}|\t|\||—)/).map(clean).filter(Boolean);
    if (pieces.length > 1) text = pieces[pieces.length - 1];
    return cleanPersonLabel(text).slice(0, 100);
  }

  function normalizePostOwnerHeadline(value) {
    return clean(value)
      .replace(/^\s*[•·]?\s*/, '')
      .replace(/\d+\s*(?:mo|yr|s|m|h|d|w)s?\s*[•·]?.*$/i, '')
      .replace(/\b(?:follow|connect|message)\b.*$/i, '')
      .trim()
      .slice(0, 260);
  }

  function isUsablePostOwnerName(value) {
    const text = clean(value);
    if (!text || text.length < 2 || text.length > 100) return false;
    if (isReactionActorLabel(text)) return false;
    if (/^(?:feed post|post owner|post author|linkedin post|linkedin member|follow|connect|message)$/i.test(text)) return false;
    if (/\b(?:likes?|liked|reacted to|commented on|reposted|shared)\s+this\b/i.test(text)) return false;
    if (/\d{3,}/.test(text)) return false;
    return /[\p{L}]/u.test(text);
  }

  function isReactionOrSocialProofNode(node) {
    if (!node?.closest) return false;
    if (node.closest([
      '.social-details-social-counts',
      '.social-details-reactors-tab-body',
      '.reactions-menu',
      '.feed-shared-social-action-bar',
      '.comments-comments-list',
      '.feed-shared-update-v2__comments-container',
      '.comments-comment-item',
      '.comments-comment-entity',
      '[data-view-name*="comment-item" i]',
      '[class*="social-proof" i]',
      '[class*="reaction" i]',
      '[data-view-name*="reaction" i]',
      '[aria-label*="reaction" i]',
      '[aria-label*="liked by" i]'
    ].join(','))) return true;
    return hasNearbySocialContext(node);
  }

  function hasNearbySocialContext(node) {
    let current = node;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      const text = clean(current.innerText || current.textContent || '');
      if (text.length > 220) break;
      if (/\b(?:likes?|liked|reacted to|commented on|reposted|shared)\s+(?:this|a post|the post)/i.test(text)) return true;
      const aria = clean(current.getAttribute?.('aria-label') || '');
      if (/\b(?:liked by|reaction|social context)\b/i.test(aria)) return true;
    }
    return false;
  }

  function isReactionActorLabel(value) {
    const text = clean(value);
    return !text ||
      /^(?:like|liked|likes|reaction|reactions|celebrate|support|love|insightful|curious)$/i.test(text) ||
      /\b(?:likes? this|liked this|reacted to this|commented on this|reposted this|shared this|and \d+ others?|reactions?)\b/i.test(text);
  }

  function extractVisibleActorName(container, profileLink = null) {
    const structured = firstText(container, [
      '.update-components-actor__name span[aria-hidden="true"]',
      '.update-components-actor__title span[aria-hidden="true"]',
      '.feed-shared-actor__name span[aria-hidden="true"]',
      '.feed-shared-actor__name',
      '.comments-post-meta__name-text span[aria-hidden="true"]',
      '.comments-comment-meta__description-title',
      '.comments-comment-meta__description-title span[aria-hidden="true"]',
      '[data-anonymize="person-name"]',
      'a[href*="/in/"] span[aria-hidden="true"]'
    ]);
    const labels = [
      structured,
      profileLink?.getAttribute?.('aria-label'),
      profileLink?.querySelector?.('img[alt]')?.getAttribute?.('alt'),
      profileLink?.innerText,
      container.querySelector?.('img[alt*="profile" i]')?.getAttribute?.('alt')
    ];
    for (const label of labels) {
      const cleaned = cleanPersonLabel(label || '')
        .replace(/['’]s\s+profile.*$/i, '')
        .replace(/^profile\s+of\s+/i, '')
        .trim();
      if (cleaned && !/^(?:follow|connect|message|linkedin member|post|comment)$/i.test(cleaned)) return cleaned;
    }
    return '';
  }

  function extractDmContext(target) {
    if (!target?.link || !target?.container) return null;
    const base = extractProfileFromCard(target.link, target.container);
    const profileUrl = normalizeLinkedInUrl(target.link.href || target.link.getAttribute('href') || base.url || '');

    if (target.type === 'dm-comment') {
      const comment = target.commentContainer || target.container;
      const commentContext = extractCommentContext(comment);
      const commentUrl = normalizeLinkedInUrl(commentContext?.profileUrl || commentContext?.authorProfileUrl || '');
      if (profileUrl && commentUrl && profileUrl !== commentUrl) {
        return { ...base, mode: 'dms', source: 'profile-hover-safe-fallback' };
      }

      const commentText = clean(commentContext?.description || '').slice(0, 3500);
      const baseDescription = clean(base.description || '');
      const profileDescription = baseDescription && normalizeMatchValue(baseDescription) !== normalizeMatchValue(commentText)
        ? baseDescription.slice(0, 1600)
        : '';
      const name = normalizeName(base.name || commentContext?.authorName || commentContext?.name);
      const headline = clean(commentContext?.headline || base.headline);

      return {
        ...base,
        mode: 'dms',
        name,
        authorName: name,
        headline,
        company: inferCompany(headline) || base.company || '',
        profileDescription,
        description: commentText || profileDescription || headline,
        commentText,
        parentPostText: clean(commentContext?.parentPostText || '').slice(0, 4200),
        parentPostAuthor: clean(commentContext?.parentPostAuthor || ''),
        parentPostHeadline: clean(commentContext?.parentPostHeadline || ''),
        parentPostProfileUrl: normalizeLinkedInUrl(commentContext?.parentPostProfileUrl || ''),
        profileUrl: profileUrl || commentUrl,
        authorProfileUrl: profileUrl || commentUrl,
        url: profileUrl || commentUrl || base.url,
        userId: commentContext?.userId || '',
        contentType: 'comment',
        contextType: 'comment-dm',
        rawText: clean([base.rawText, commentText, commentContext?.parentPostText].filter(Boolean).join('\n')).slice(0, 8500),
        source: 'dm-comment-hover'
      };
    }

    if (target.type === 'dm-post') {
      const post = target.postContainer || target.container;
      const postContext = extractPostContext(post);
      const postAuthorUrl = normalizeLinkedInUrl(postContext?.profileUrl || '');
      if (profileUrl && postAuthorUrl && profileUrl !== postAuthorUrl) {
        return { ...base, mode: 'dms', source: 'profile-hover-safe-fallback' };
      }

      const postText = clean(postContext?.description || '').slice(0, 4200);
      const baseDescription = clean(base.description || '');
      const profileDescription = baseDescription && normalizeMatchValue(baseDescription) !== normalizeMatchValue(postText)
        ? baseDescription.slice(0, 1600)
        : '';
      const name = normalizeName(base.name || postContext?.authorName || postContext?.name);
      const headline = clean(postContext?.headline || base.headline);

      return {
        ...base,
        mode: 'dms',
        name,
        authorName: name,
        headline,
        company: inferCompany(headline) || base.company || '',
        profileDescription,
        description: postText || profileDescription || headline,
        parentPostText: postText,
        parentPostAuthor: name,
        parentPostHeadline: headline,
        parentPostProfileUrl: profileUrl || postAuthorUrl,
        profileUrl: profileUrl || postAuthorUrl,
        authorProfileUrl: profileUrl || postAuthorUrl,
        url: profileUrl || postAuthorUrl || base.url,
        userId: postContext?.userId || '',
        contentType: 'post',
        contextType: 'post-dm',
        rawText: clean([base.rawText, postText].filter(Boolean).join('\n')).slice(0, 7500),
        source: 'dm-post-hover'
      };
    }

    return { ...base, mode: 'dms' };
  }

  function extractCommentContext(comment) {
    const rawText = clean(comment.innerText || comment.textContent || '').slice(0, 5000);
    const authorLink = findCommentAuthorLink(comment);
    const author = extractVisibleActorName(comment, authorLink);
    const headline = firstText(comment, [
      '.comments-comment-meta__description-subtitle',
      '.comments-post-meta__headline',
      '.artdeco-entity-lockup__subtitle',
      '[data-anonymize="headline"]'
    ]);
    const body = extractCommentBody(comment);
    const parentPost = findPostContainer(comment.parentElement || comment);
    const postContext = parentPost ? extractPostContext(parentPost) : null;
    const profileUrl = normalizeLinkedInUrl(authorLink?.href || authorLink?.getAttribute?.('href') || '');
    const userId = (() => {
      try {
        return decodeURIComponent(new URL(profileUrl).pathname.match(/\/in\/([^/?#]+)/i)?.[1] || '');
      } catch (_) {
        return '';
      }
    })();

    return {
      mode: 'comments',
      name: author || 'Comment author',
      authorName: author,
      contentType: 'comment',
      headline: clean(headline) || 'Comment author',
      company: inferCompany(headline),
      location: '',
      profileUrl,
      authorProfileUrl: profileUrl,
      userId,
      description: body.slice(0, 3500),
      rawText,
      parentPostAuthor: postContext?.authorName || postContext?.name || '',
      parentPostHeadline: postContext?.headline || '',
      parentPostProfileUrl: postContext?.profileUrl || '',
      parentPostText: postContext?.description || '',
      url: normalizeLinkedInUrl(authorLink?.href || location.href),
      source: 'comment-hover'
    };
  }

  function extractCommentBody(comment) {
    const text = firstText(comment, [
      '.comments-comment-item__main-content',
      '.comments-comment-item-content-body',
      '.comments-comment-item__comment-text',
      '.comments-comment-entity__content',
      '.comments-comment-texteditor__content',
      '[data-view-name="comment-content"]',
      '[data-view-name*="comment-text"]'
    ]);
    if (text) return clean(text);

    const clone = comment.cloneNode(true);
    clone.querySelectorAll([
      'button', 'svg', 'time', '.comments-comment-social-bar',
      '.comments-comment-meta__description-container',
      '.comments-comment-item__options', '[contenteditable="true"]'
    ].join(',')).forEach((element) => element.remove());
    const lines = clean(clone.innerText)
      .split(/\n+/)
      .map(clean)
      .filter(Boolean)
      .filter((line) => !isPostUiLine(line));
    return lines.slice(-4).join(' ').slice(0, 3500);
  }

  function extractPostBody(post) {
    const text = firstText(post, [
      '.update-components-text',
      '.update-components-text__text-view',
      '.update-components-text-view',
      '.update-components-update-v2__commentary',
      '.feed-shared-update-v2__description',
      '.feed-shared-inline-show-more-text',
      '.feed-shared-text',
      '.main-feed-activity-card__commentary',
      '[data-test-id="main-feed-activity-card__commentary"]',
      '[data-testid*="commentary" i]',
      '[data-testid*="post-content" i]',
      '[data-view-name="feed-commentary"]',
      '[data-view-name="feed-update-text"]',
      '[data-view-name*="feed-commentary"]'
    ]);
    if (text) return clean(text);

    const textFallback = extractPostBodyFromText(post?.innerText || post?.textContent || '');
    if (textFallback.length >= 12) return textFallback;

    const clone = post.cloneNode(true);
    clone.querySelectorAll([
      '.social-details-social-counts',
      '.feed-shared-social-action-bar',
      '.update-v2-social-activity',
      '.update-components-actor',
      '.feed-shared-actor',
      '.comments-post-meta',
      '[data-view-name="feed-actor"]',
      '[data-view-name*="social-context" i]',
      '[class*="social-context" i]',
      '.comments-comments-list',
      '.feed-shared-update-v2__comments-container',
      '.comments-comment-box',
      '.artdeco-dropdown',
      'button',
      'svg'
    ].join(',')).forEach((element) => element.remove());

    return clean(clone.innerText)
      .split(/\n+/)
      .map(clean)
      .filter((line) => line.length > 8 && !isPostNoiseLine(line))
      .slice(0, 18)
      .join('\n')
      .slice(0, 3500);
  }

  function extractPostBodyFromText(value) {
    const raw = String(value || '').replace(/\u00a0/g, ' ');
    const lines = raw.split(/\n+/).map(clean).filter(Boolean);
    const timestampIndex = lines.findIndex((line) =>
      /^\d+\s*(?:mo|yr|s|m|h|d|w)s?\s*[•·]?$/i.test(line) ||
      /^\d+\s*(?:mo|yr|s|m|h|d|w)s?\s*[•·]\s*/i.test(line)
    );
    if (timestampIndex >= 0) {
      const afterTimestamp = lines
        .slice(timestampIndex + 1)
        .filter((line) => !isPostNoiseLine(line))
        .filter((line) => !/^\+?[\d,]+\s+(?:reactions?|comments?|reposts?)\b/i.test(line));
      const joined = afterTimestamp.slice(0, 24).join('\n').trim();
      if (joined.length >= 12) return joined.slice(0, 3500);
    }

    let compact = clean(raw.replace(/\n+/g, ' '));
    compact = compact
      .replace(/^.*?\d+\s*(?:mo|yr|s|m|h|d|w)s?\s*[•·]\s*/i, '')
      .replace(/\s*\+?[\d,]+\s+(?:reactions?|comments?|reposts?)\b.*$/i, '')
      .replace(/\s+(?:like|comment|repost|send)\s*$/i, '')
      .trim();
    if (/^feed\s+post/i.test(compact)) return '';
    return compact.slice(0, 3500);
  }

  function isPostNoiseLine(line) {
    return /^(like|comment|repost|send|follow|connect|see more|…more|show more|show less|promoted|sponsored|edited|\d+\s*(?:reactions?|comments?|reposts?)?)$/i.test(line) ||
      /^\d+[smhdw]\s*•?$/i.test(line) ||
      /^view\s+.*(?:profile|post)$/i.test(line);
  }


  function findConversationRootFromTarget(target) {
    const element = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    if (!element?.closest) return null;

    // Start at the exact hovered/focused element instead of requiring the
    // pointer to be over a bubble or composer. LinkedIn users commonly hover a
    // conversation header, blank thread space, attachment, or timestamp.
    const shell = findConversationOuterShell(element);
    return shell && isSafeConversationRootCandidate(shell) ? shell : null;
  }


  function findConversationOuterShell(element) {
    if (!element?.closest) return null;
    let best = null;
    let node = element;
    for (let depth = 0; node && depth < 14; depth += 1, node = node.parentElement) {
      if (node === document.body || node === document.documentElement) break;
      if (isSafeConversationRootCandidate(node)) best = node;
    }
    return best;
  }


  function visibleConversationOuterShells() {
    const shells = [];
    const add = (candidate) => {
      const shell = findConversationOuterShell(candidate) || candidate;
      if (!shell || shells.includes(shell) || !isSafeConversationRootCandidate(shell) || !isVisible(shell)) return;
      if (shells.some((existing) => existing.contains(shell))) return;
      for (let index = shells.length - 1; index >= 0; index -= 1) {
        if (shell.contains(shells[index])) shells.splice(index, 1);
      }
      shells.push(shell);
    };
    for (const selector of STRICT_CONVERSATION_SHELL_SELECTORS) {
      document.querySelectorAll(selector).forEach(add);
    }
    document.querySelectorAll(CONVERSATION_MESSAGE_LIST_SELECTORS.join(',')).forEach(add);
    document.querySelectorAll(CONVERSATION_COMPOSER_SELECTORS.join(',')).forEach((composer) => {
      if (isLikelyMessagingComposer(composer)) add(composer);
    });

    // Full-page LinkedIn Messaging sometimes removes the old msg-thread class
    // and leaves only generic main/section wrappers. This remains safe because
    // isSafeConversationRootCandidate rejects feed/comment content and requires
    // a real message list or composer inside the candidate.
    if (/\/messaging(?:\/|$)/i.test(location.pathname)) {
      document.querySelectorAll('main, [role="main"]').forEach(add);
    }
    return shells;
  }


  function conversationRootEvidence(element) {
    const listSelector = CONVERSATION_MESSAGE_LIST_SELECTORS.join(',');
    const messageSelector = CONVERSATION_MESSAGE_SELECTORS.join(',');
    const composerSelector = CONVERSATION_COMPOSER_SELECTORS.join(',');
    const metadata = clean([
      String(element.className || ''),
      element.getAttribute?.('data-view-name'),
      element.getAttribute?.('data-testid'),
      element.getAttribute?.('data-control-name'),
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('role')
    ].filter(Boolean).join(' '));
    const visibleLists = [
      ...(element.matches?.(listSelector) ? [element] : []),
      ...element.querySelectorAll(listSelector)
    ].filter((candidate, index, all) => all.indexOf(candidate) === index && isVisible(candidate));
    const hasList = visibleLists.length > 0;
    const hasMessages = Boolean(element.matches?.(messageSelector) || element.querySelector(messageSelector));
    const hasComposer = [
      ...(element.matches?.(composerSelector) ? [element] : []),
      ...element.querySelectorAll(composerSelector)
    ].some((composer) => isVisible(composer) && isLikelyMessagingComposer(composer));
    const hasHeader = Boolean(element.querySelector([
      '.msg-overlay-bubble-header',
      '.msg-thread__top-card',
      '.msg-entity-lockup',
      '[data-view-name*="conversation-header"]',
      '[data-testid*="conversation-header" i]',
      'header'
    ].join(',')));
    const explicitShell = STRICT_CONVERSATION_SHELL_SELECTORS.some((selector) => element.matches?.(selector));
    const hasMessagingMetadata = /msg-|message-list|message-thread|conversation|messaging|chat|inbox/i.test(metadata);
    const isDialog = element.getAttribute?.('role') === 'dialog';
    const isMessagingMain = /\/messaging(?:\/|$)/i.test(location.pathname) &&
      (element.tagName === 'MAIN' || element.getAttribute?.('role') === 'main');
    return {
      explicitShell,
      hasList,
      hasMessages,
      hasComposer,
      hasHeader,
      hasMessagingMetadata,
      isDialog,
      isMessagingMain,
      visibleListCount: visibleLists.length
    };
  }


  function isSafeConversationRootCandidate(element) {
    if (!element?.querySelectorAll || !element.isConnected) return false;
    if (element === document.body || element === document.documentElement) return false;

    const feedContamination = element.querySelector([
      '[data-urn^="urn:li:activity"]',
      '[data-urn*="urn:li:activity"]',
      '.feed-shared-update-v2',
      '.occludable-update',
      '[data-view-name="feed-full-update"]',
      '[data-view-name="feed-update"]',
      '.comments-comments-list',
      '.comments-comment-item'
    ].join(','));
    if (feedContamination) return false;

    const evidence = conversationRootEvidence(element);
    if (evidence.visibleListCount > 1 && !evidence.isMessagingMain) return false;

    const supportedStructure =
      (evidence.explicitShell && (evidence.hasMessages || evidence.hasList || evidence.hasComposer)) ||
      (evidence.hasComposer && (evidence.hasMessages || evidence.hasList)) ||
      (evidence.hasList && evidence.hasMessages && (evidence.hasHeader || evidence.hasMessagingMetadata || evidence.isMessagingMain)) ||
      (evidence.isDialog && evidence.hasMessages && (evidence.hasComposer || evidence.hasHeader)) ||
      (evidence.isMessagingMain && evidence.hasMessages && (evidence.hasComposer || evidence.hasList));

    return Boolean(supportedStructure);
  }


  function conversationRootMatchesExpected(root, expectedName = '') {
    const expected = canonicalPersonName(expectedName);
    if (!root || !expected) return true;
    const actualName = conversationParticipantName(root, null);
    if (actualName && namesLikelyMatch(actualName, expectedName)) return true;
    const ariaName = extractConversationNameFromAria(root);
    if (ariaName && namesLikelyMatch(ariaName, expectedName)) return true;
    return false;
  }


  function isLikelyConversationMessageText(text) {
    const value = cleanConversationText(text);
    if (value.length < 2 || value.length > 2600 || !/[\p{L}\p{N}]/u.test(value)) return false;
    if (isConversationNoiseLine(value)) return false;
    if (/^(messaging|focused|other|inmail|compose|new message|search|search messages|details|more options|send|reply|attach|emoji|gif|image|video|audio)$/i.test(value)) return false;
    if (/^(?:active now|online|offline|sponsored|promoted|typing…?|seen|delivered|read)$/i.test(value)) return false;
    return true;
  }


  function conversationShellIdentity(shell) {
    if (!shell) return '';
    const explicit = clean([
      shell.getAttribute?.('data-conversation-id'),
      shell.getAttribute?.('data-thread-id'),
      shell.getAttribute?.('data-urn'),
      shell.getAttribute?.('id')
    ].filter(Boolean).join('|'));
    if (explicit) return `thread:${explicit.toLowerCase()}`;
    const name = conversationParticipantName(shell, null);
    return name ? `person:${canonicalPersonName(name)}` : `shell:${clean(shell.getAttribute?.('aria-label') || shell.className || '').slice(0, 180)}`;
  }

  function extractConversationTranscript(root) {
    if (!root) return '';
    const messages = extractRecentConversationMessages(root, findActiveConversationRow());
    return messages
      .map(formatConversationMessage)
      .join('\n\n')
      .slice(-9000);
  }

  function formatConversationMessage({ sender, direction, text }) {
    if (direction === 'self') return `[YOU]: ${text}`;
    if (direction === 'contact') return `[CONTACT${sender && sender !== 'Contact' ? ` - ${sender}` : ''}]: ${text}`;
    return `[UNKNOWN SENDER]: ${text}`;
  }

  function extractRecentConversationMessages(root, row = null) {
    const messageNodes = getConversationMessageNodes(root);
    const records = [];
    const groupDirections = new Map();
    const contactName = conversationParticipantName(root, row) || 'Contact';

    for (const node of messageNodes) {
      const text = extractMessageText(node);
      if (!text) continue;

      const group = findMessageGroup(node);
      const senderInfo = extractMessageSender(node, root, contactName);
      let direction = senderInfo.direction;
      let sender = senderInfo.sender;

      // Consecutive bubbles inside the same LinkedIn message group often omit
      // the author label after the first bubble.
      if (direction === 'unknown' && group && groupDirections.has(group)) {
        const known = groupDirections.get(group);
        direction = known.direction;
        sender = known.sender;
      }

      if (direction !== 'unknown' && group) groupDirections.set(group, { direction, sender });
      records.push({
        sender,
        direction,
        text,
        node,
        group,
        layout: getMessageLayoutMetrics(node, root),
        contactMarker: hasContactIdentityMarker(node, contactName)
      });
    }

    const uniqueRecords = dedupeConversationRecords(records);
    resolveUnknownConversationDirections(uniqueRecords, root, row, contactName);

    const resolved = uniqueRecords
      .map(({ sender, direction, text }) => ({ sender, direction, text }))
      .slice(-MAX_CONVERSATION_MESSAGES);
    return resolved.length ? resolved : extractConversationTextFallback(root, row, contactName);
  }

  function extractConversationTextFallback(root, row, contactName = 'Contact') {
    if (!root) return [];
    const ownName = canonicalPersonName(currentUserName);
    const participantName = canonicalPersonName(contactName);
    const lines = clean(root.innerText || root.textContent || '')
      .split(/\n+/)
      .map(cleanConversationText)
      .filter((line) => {
        if (!isLikelyConversationMessageText(line)) return false;
        const canonical = canonicalPersonName(line);
        if (canonical && (canonical === ownName || canonical === participantName)) return false;
        return !/^(?:view profile|open profile|start a new conversation|load older messages|show earlier messages|message actions|conversation details)$/i.test(line);
      });

    const unique = [];
    for (const line of lines) {
      if (!unique.length || normalizeMessageIdentity(unique.at(-1)) !== normalizeMessageIdentity(line)) unique.push(line);
    }
    const recent = unique.slice(-MAX_CONVERSATION_MESSAGES);
    if (!recent.length) return [];

    const previewDirection = conversationRowLatestDirection(row);
    return recent.map((line, index) => {
      let direction = 'unknown';
      let text = line;
      if (/^(?:you|me)\s*[:·-]\s*/i.test(line)) {
        direction = 'self';
        text = line.replace(/^(?:you|me)\s*[:·-]\s*/i, '');
      } else if (contactName && new RegExp(`^${escapeRegExp(contactName)}\\s*[:·-]\\s*`, 'i').test(line)) {
        direction = 'contact';
        text = line.replace(new RegExp(`^${escapeRegExp(contactName)}\\s*[:·-]\\s*`, 'i'), '');
      } else if (index === recent.length - 1 && previewDirection !== 'unknown') {
        direction = previewDirection;
      }
      if (direction === 'unknown') direction = index === recent.length - 1 ? 'contact' : 'unknown';
      return {
        sender: direction === 'self' ? 'You' : (direction === 'contact' ? contactName : 'Unknown'),
        direction,
        text: cleanConversationText(text)
      };
    }).filter((message) => message.text);
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function dedupeConversationRecords(records) {
    const unique = [];
    for (const record of records) {
      const duplicateIndex = unique.findIndex((existing) =>
        normalizeMessageIdentity(existing.text) === normalizeMessageIdentity(record.text) &&
        nodesRepresentSameRenderedMessage(existing.node, record.node)
      );
      if (duplicateIndex < 0) {
        unique.push(record);
        continue;
      }

      const existing = unique[duplicateIndex];
      // Keep the record with stronger sender evidence and the more specific node.
      const existingKnown = existing.direction !== 'unknown';
      const recordKnown = record.direction !== 'unknown';
      const existingContainsRecord = existing.node?.contains?.(record.node);
      if ((!existingKnown && recordKnown) || (existingContainsRecord && !record.node?.contains?.(existing.node))) {
        unique[duplicateIndex] = record;
      }
    }
    return unique;
  }

  function nodesRepresentSameRenderedMessage(a, b) {
    if (!a || !b) return false;
    if (a === b || a.contains?.(b) || b.contains?.(a)) return true;

    const aEvent = closestMessageEvent(a);
    const bEvent = closestMessageEvent(b);
    if (aEvent && bEvent && aEvent === bEvent) return true;

    const aId = messageNodeIdentity(aEvent || a);
    const bId = messageNodeIdentity(bEvent || b);
    if (aId && bId && aId === bId) return true;

    const ar = a.getBoundingClientRect?.();
    const br = b.getBoundingClientRect?.();
    if (!ar || !br || !ar.width || !br.width) return false;
    const overlapX = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.left, br.left));
    const overlapY = Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top));
    const overlapArea = overlapX * overlapY;
    const smallerArea = Math.min(ar.width * ar.height, br.width * br.height);
    return smallerArea > 0 && overlapArea / smallerArea > 0.82;
  }

  function closestMessageEvent(node) {
    return node?.closest?.([
      '.msg-s-event-listitem',
      '.msg-s-message-list__event',
      '[data-event-urn]',
      '[data-view-name="message-list-item"]',
      '[data-view-name*="message-list-item"]',
      '[data-view-name*="message-event"]',
      '[data-view-name*="conversation-message"]',
      '[data-testid*="message-bubble" i]',
      '[data-testid*="message-body" i]',
      '[class*="event-listitem"]',
      '[class*="message-list__event"]',
      '[class*="messageBubble"]',
      '[role="article"][aria-label*="message" i]'
    ].join(',')) || null;
  }

  function messageNodeIdentity(node) {
    if (!node?.getAttribute) return '';
    return clean([
      node.getAttribute('data-event-urn'),
      node.getAttribute('data-urn'),
      node.getAttribute('data-id'),
      node.getAttribute('id')
    ].filter(Boolean).join('|'));
  }

  function normalizeMessageIdentity(value) {
    return cleanConversationText(value).toLowerCase().replace(/[\u200b-\u200d\ufeff]/g, '').trim();
  }

  function resolveUnknownConversationDirections(records, root, row, contactName) {
    if (!records.length) return;

    // Learn what each visual lane means from any explicit LinkedIn sender marker.
    const laneDirections = new Map();
    for (const record of records) {
      if (record.direction !== 'unknown' && record.layout?.lane && record.layout.lane !== 'center') {
        laneDirections.set(record.layout.lane, record.direction);
      }
    }

    for (const record of records) {
      if (record.direction !== 'unknown') continue;
      const learned = laneDirections.get(record.layout?.lane);
      if (learned) setResolvedDirection(record, learned, contactName);
    }

    // A profile link/avatar inside a message event is strong evidence that the
    // event belongs to the other participant.
    for (const record of records) {
      if (record.direction === 'unknown' && record.contactMarker) {
        setResolvedDirection(record, 'contact', contactName);
        if (record.layout?.lane && record.layout.lane !== 'center') laneDirections.set(record.layout.lane, 'contact');
      }
    }

    // Re-apply the learned lane after discovering contact-avatar evidence.
    for (const record of records) {
      if (record.direction !== 'unknown') continue;
      const learned = laneDirections.get(record.layout?.lane);
      if (learned) setResolvedDirection(record, learned, contactName);
    }

    const positioned = records.filter((record) => Number.isFinite(record.layout?.centerRatio));
    if (positioned.length >= 2) {
      const ratios = positioned.map((record) => record.layout.centerRatio);
      const min = Math.min(...ratios);
      const max = Math.max(...ratios);
      // LinkedIn may omit every sender class, but incoming and outgoing bubbles
      // still occupy two separate horizontal lanes.
      if (max - min >= 0.075) {
        const split = (min + max) / 2;
        for (const record of positioned) {
          if (record.direction !== 'unknown') continue;
          setResolvedDirection(record, record.layout.centerRatio > split ? 'self' : 'contact', contactName);
        }
      }
    }

    // CSS alignment and geometry are evaluated per bubble. This catches the
    // current LinkedIn UI where the outer event is full width but an inner
    // message body uses margin-left:auto / flex-end.
    for (const record of records) {
      if (record.direction === 'unknown' && record.layout?.direction !== 'unknown') {
        setResolvedDirection(record, record.layout.direction, contactName);
      }
    }

    // The inbox row often exposes “You: …” even when the open thread omits all
    // sender metadata. When its snippet matches the newest bubble, it is stronger
    // evidence than lane geometry because compact LinkedIn layouts can align both
    // participants to the same side.
    const previewDirection = conversationRowLatestDirection(row);
    const previewText = cleanConversationText(extractConversationRowSnippet(row).replace(/^(?:you|me)\s*[:·-]\s*/i, ''));
    const newest = records.at(-1);
    const previewMatchesNewest = Boolean(
      newest?.text && previewText &&
      normalizeMessageIdentity(newest.text) === normalizeMessageIdentity(previewText)
    );
    if (newest && previewDirection !== 'unknown' && (newest.direction === 'unknown' || previewMatchesNewest)) {
      setResolvedDirection(newest, previewDirection, contactName);
    }

    // Propagate within the same LinkedIn message group after all stronger
    // evidence has been applied.
    const groupKnown = new Map();
    for (const record of records) {
      if (record.group && record.direction !== 'unknown') groupKnown.set(record.group, record.direction);
    }
    for (const record of records) {
      const known = record.group && groupKnown.get(record.group);
      if (record.direction === 'unknown' && known) setResolvedDirection(record, known, contactName);
    }

    // Last-resort centre-based classification. A one-to-one LinkedIn thread has
    // only two participants; right-of-centre is the user, left-of-centre is the
    // contact. Truly centred system events are ignored by extractMessageText.
    for (const record of records) {
      if (record.direction !== 'unknown') continue;
      const ratio = record.layout?.centerRatio;
      if (Number.isFinite(ratio) && ratio >= 0.53) setResolvedDirection(record, 'self', contactName);
      else setResolvedDirection(record, 'contact', contactName);
    }
  }

  function setResolvedDirection(record, direction, contactName) {
    record.direction = direction;
    record.sender = direction === 'self' ? 'You' : (contactName || 'Contact');
  }

  function conversationRowLatestDirection(row) {
    if (!row) return 'unknown';
    const snippet = extractConversationRowSnippet(row);
    const metadata = clean([
      snippet,
      row.getAttribute?.('aria-label'),
      row.getAttribute?.('title'),
      row.innerText || row.textContent || ''
    ].filter(Boolean).join(' '));
    if (/^(?:you|me)\s*[:·-]/i.test(snippet) || /(?:^|\b)(?:you sent|sent by you|your message)(?:\b|$)/i.test(metadata)) return 'self';
    return snippet ? 'contact' : 'unknown';
  }

  function findActiveConversationRow() {
    const seen = new Set();
    for (const selector of CONVERSATION_ROW_SELECTORS) {
      for (const candidate of document.querySelectorAll(selector)) {
        const row = candidate.matches?.('a[href*="/messaging/"]')
          ? candidate.closest?.('.msg-conversation-listitem, .msg-conversations-container__convo-item, [data-view-name="conversation-list-item"], [role="listitem"]') || candidate
          : candidate;
        if (!row || seen.has(row)) continue;
        seen.add(row);
        if (isLikelyConversationRow(row) && isConversationRowActive(row)) return row;
      }
    }
    return null;
  }

  function getConversationMessageNodes(root) {
    const bodySelectors = [
      '.msg-s-event-listitem__body',
      '.msg-s-message-list__message-bubble',
      '.msg-s-event-listitem__message-bubble',
      '.msg-s-event-listitem__message-bubble--msg-fwd-enabled',
      '[data-view-name="message-body"]',
      '[data-view-name*="message-body"]',
      '[data-view-name*="message-bubble"]',
      '[data-view-name*="conversation-message"]',
      '[data-testid*="message-bubble" i]',
      '[data-testid*="message-body" i]',
      '[class*="message-bubble"]',
      '[class*="messageBubble"]',
      '[role="article"][aria-label*="message" i]',
      '.msg-s-message-group__messages p'
    ];
    const containerSelector = [
      '.msg-s-event-listitem',
      '.msg-s-message-list__event',
      '[data-event-urn]',
      '[data-view-name="message-list-item"]',
      '[data-view-name*="message-list-item"]',
      '[data-view-name*="message-event"]',
      '[data-view-name*="conversation-message"]',
      '[data-testid*="message-bubble" i]',
      '[data-testid*="message-body" i]',
      '.msg-s-message-group__messages > li',
      '.msg-s-message-group__message',
      '[class*="event-listitem"]',
      '[class*="message-list__event"]',
      '[class*="messageBubble"]',
      '[role="article"][aria-label*="message" i]'
    ].join(',');

    const nodes = [];
    const addNode = (node) => {
      if (!node || !root.contains(node) || nodes.includes(node)) return;
      nodes.push(node);
    };

    if (root.matches?.(bodySelectors.join(',')) || root.matches?.(containerSelector)) addNode(root);

    for (const body of root.querySelectorAll(bodySelectors.join(','))) {
      addNode(body.closest(containerSelector) || body);
    }

    if (!nodes.length) {
      root.querySelectorAll(containerSelector).forEach(addNode);
    }

    if (!nodes.length) {
      root.querySelectorAll('[role="listitem"], li').forEach((candidate) => {
        if (candidate.closest('.msg-conversations-container, [data-view-name*="conversation-list"]')) return;
        if (candidate.querySelector('[contenteditable="true"], textarea, input')) return;
        const text = cleanConversationText(candidate.innerText || candidate.textContent || '');
        if (text.length >= 2 && text.length <= 2600) addNode(candidate);
      });
    }

    // A/B-tested LinkedIn builds can render messages as plain div/p elements.
    // Supplement sparse selector results with geometry/text-based candidates.
    if (nodes.length < 2) {
      collectGenericConversationNodes(root).forEach(addNode);
    }

    return nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return node.isConnected && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .sort((a, b) => {
        if (a === b) return 0;
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
  }

  function collectGenericConversationNodes(root) {
    if (!root?.querySelectorAll) return [];
    const rootRect = root.getBoundingClientRect();
    const candidates = root.querySelectorAll([
      '[aria-label*="message from" i]',
      '[aria-label*="sent by you" i]',
      '[aria-label*="you sent" i]',
      '[aria-label*="received" i]',
      '[data-message-id]',
      '[data-message-urn]',
      '[data-sender]',
      '[data-author]',
      '[role="article"]',
      'p',
      '[dir="ltr"]'
    ].join(','));
    const nodes = [];
    const add = (node) => {
      if (!node || nodes.includes(node) || !root.contains(node)) return;
      nodes.push(node);
    };

    let checked = 0;
    for (const candidate of candidates) {
      if (checked++ > 260) break;
      if (candidate.closest?.('.msg-conversations-container, [data-view-name*="conversation-list"]')) continue;
      if (candidate.closest?.(CONVERSATION_COMPOSER_SELECTORS.join(','))) continue;
      if (candidate.closest?.('header, nav, button, [role="button"], [role="toolbar"], .msg-form, .msg-compose-form')) continue;

      const text = cleanConversationText(candidate.innerText || candidate.textContent || '');
      if (!isLikelyConversationMessageText(text)) continue;

      const rect = candidate.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;
      if (rootRect.width && rect.width > rootRect.width * 0.98 && rect.height > 90) continue;

      const bubble = candidate.closest?.([
        '[data-message-id]',
        '[data-message-urn]',
        '[data-sender]',
        '[data-author]',
        '[role="article"]',
        '[aria-label*="message from" i]',
        '[aria-label*="sent by you" i]',
        '[aria-label*="you sent" i]',
        '[class*="bubble" i]',
        '[class*="message" i]'
      ].join(',')) || candidate;
      add(bubble === root ? candidate : bubble);
    }
    return nodes;
  }

  function extractMessageText(node) {
    const directBodies = [...node.querySelectorAll([
      '.msg-s-event-listitem__body',
      '.msg-s-message-list__message-bubble',
      '.msg-s-event-listitem__message-bubble',
      '.msg-s-event-listitem__message-bubble--msg-fwd-enabled',
      '.msg-s-message-list__message-bubble [dir="ltr"]',
      '.msg-s-event-listitem__message-bubble [dir="ltr"]',
      '.msg-s-message-group__messages p',
      '[data-view-name="message-body"]',
      '[data-view-name*="message-body"]',
      '[data-view-name*="message-bubble"] [dir="ltr"]',
      '[data-view-name*="conversation-message"] [dir="ltr"]',
      '[data-testid*="message-bubble" i] [dir="ltr"]',
      '[data-testid*="message-body" i]',
      '[class*="messageBubble"] [dir="ltr"]',
      'p'
    ].join(','))];

    const parts = directBodies
      .map((element) => cleanConversationText(element.innerText || element.textContent || ''))
      .filter(Boolean);
    const uniqueParts = [...new Set(parts)];
    const combined = uniqueParts.join(' ').trim();
    if (combined) return combined.slice(0, 2400);

    return cleanConversationText(node.innerText).slice(0, 2400);
  }

  function findMessageGroup(node) {
    return node?.closest?.([
      '.msg-s-message-group',
      '[data-view-name*="message-group"]',
      '[data-testid*="message-group" i]',
      '[class*="message-group"]',
      '[class*="messageGroup"]'
    ].join(',')) || null;
  }

  function extractMessageSender(node, root = null, contactName = '') {
    const group = findMessageGroup(node) || node;
    const event = closestMessageEvent(node) || group;
    const scopes = [...new Set([node, group, event].filter(Boolean))];

    const selfSelector = [
      '.msg-s-message-group--is-self',
      '.msg-s-message-group--self',
      '.msg-s-message-list__event--self',
      '.msg-s-event-listitem--self',
      '[data-is-self="true"]',
      '[data-sender-type="SELF"]',
      '[data-sender-type="self"]',
      '[data-message-author="self"]',
      '[data-author="self"]',
      '[data-message-direction="outgoing"]',
      '[data-direction="outgoing"]',
      '[data-is-outgoing="true"]',
      '[data-view-name*="outgoing-message"]',
      '[data-testid*="outgoing-message" i]'
    ].join(',');

    const explicitSelf = scopes.some((scope) => scope.matches?.(selfSelector) || scope.closest?.(selfSelector) || scope.querySelector?.(selfSelector));
    const metadataText = collectMessageMetadata(scopes);
    const className = scopes.map((scope) => String(scope.className || '')).join(' ');

    if (explicitSelf ||
        /from-me|outgoing|(?:^|[-_\s])self(?:$|[-_\s])|message--me|is-own|own-message|sent-message|message-from-me|event-listitem--me/i.test(className) ||
        /(?:^|\b)(?:you sent|sent by you|message from you|outgoing message|your message)(?:\b|$)/i.test(metadataText)) {
      return { sender: 'You', direction: 'self' };
    }

    const contactSelector = [
      '[data-sender-type="OTHER"]',
      '[data-sender-type="other"]',
      '[data-message-author="other"]',
      '[data-author="other"]',
      '[data-message-direction="incoming"]',
      '[data-direction="incoming"]',
      '[data-is-outgoing="false"]',
      '[data-view-name*="incoming-message"]',
      '[data-testid*="incoming-message" i]'
    ].join(',');
    const explicitContact = scopes.some((scope) => scope.matches?.(contactSelector) || scope.closest?.(contactSelector) || scope.querySelector?.(contactSelector));
    if (explicitContact ||
        /from-them|incoming|received|message--other|is-other|received-message|message-from-them|event-listitem--other/i.test(className) ||
        /(?:^|\b)(?:incoming message|received message|message from contact|sent to you)(?:\b|$)/i.test(metadataText)) {
      return { sender: contactName || 'Contact', direction: 'contact' };
    }

    const sender = cleanPersonLabel(firstText(group, [
      '.msg-s-message-group__name',
      '.msg-s-message-list__profile-link',
      '.msg-s-message-group__profile-link',
      '[data-anonymize="person-name"]',
      '[data-view-name*="sender"]',
      '[data-view-name*="author"]',
      'a[href*="/in/"]'
    ]) || firstText(event, [
      '.msg-s-message-group__name',
      '.msg-s-message-list__profile-link',
      '.msg-s-message-group__profile-link',
      '[data-anonymize="person-name"]',
      '[data-view-name*="sender"]',
      '[data-view-name*="author"]'
    ]) || firstAttributeText(scopes, [
      'img[alt]',
      '[aria-label*="profile" i]',
      '[aria-label*="sender" i]',
      '[aria-label*="author" i]'
    ], ['alt', 'aria-label']));

    if (/^you$/i.test(sender) || isCurrentUserName(sender)) {
      return { sender: 'You', direction: 'self' };
    }

    if (sender && (!contactName || namesLikelyMatch(sender, contactName))) {
      return { sender: contactName || sender, direction: 'contact' };
    }

    const metadataSender = metadataText.match(/(?:message\s+from|sent\s+by|from)\s+([\p{L}\p{N} .'-]{2,80})/iu)?.[1] || '';
    if (metadataSender) {
      if (isCurrentUserName(metadataSender) || /^(?:you|me)$/i.test(cleanPersonLabel(metadataSender))) {
        return { sender: 'You', direction: 'self' };
      }
      return { sender: contactName || cleanPersonLabel(metadataSender) || 'Contact', direction: 'contact' };
    }

    if (hasContactIdentityMarker(event, contactName)) {
      return { sender: contactName || sender || 'Contact', direction: 'contact' };
    }

    const layoutDirection = inferMessageDirectionFromLayout(node, root);
    if (layoutDirection === 'self') return { sender: 'You', direction: 'self' };
    if (layoutDirection === 'contact') return { sender: contactName || sender || 'Contact', direction: 'contact' };

    if (/from-them|incoming|received|message--other|is-other|received-message|message-from-them|event-listitem--other/i.test(className) ||
        /(?:^|\b)(?:received message|message from|sent you)(?:\b|$)/i.test(metadataText)) {
      return { sender: contactName || sender || 'Contact', direction: 'contact' };
    }

    return { sender: sender || 'Unknown', direction: 'unknown' };
  }

  function collectMessageMetadata(scopes) {
    const values = [];
    const attributes = [
      'aria-label', 'title', 'data-sender-type', 'data-message-author', 'data-author',
      'data-message-direction', 'data-direction', 'data-is-self', 'data-is-outgoing',
      'data-view-name', 'data-testid'
    ];
    for (const scope of scopes) {
      if (!scope?.getAttribute) continue;
      for (const attribute of attributes) values.push(scope.getAttribute(attribute) || '');
      const descendants = scope.querySelectorAll?.('[aria-label], [title], [data-sender-type], [data-message-author], [data-author], [data-message-direction], [data-direction], [data-is-self], [data-is-outgoing]') || [];
      for (const element of [...descendants].slice(0, 30)) {
        for (const attribute of attributes) values.push(element.getAttribute?.(attribute) || '');
      }
      values.push(firstText(scope, ['.visually-hidden', '.screen-reader-text', '[aria-hidden="false"]']));
    }
    return clean(values.filter(Boolean).join(' '));
  }

  function firstAttributeText(scopes, selectors, attributes) {
    for (const scope of scopes) {
      for (const selector of selectors) {
        const element = scope?.matches?.(selector) ? scope : scope?.querySelector?.(selector);
        if (!element) continue;
        for (const attribute of attributes) {
          const value = cleanPersonLabel(element.getAttribute?.(attribute) || '');
          if (value) return value;
        }
      }
    }
    return '';
  }

  function hasContactIdentityMarker(node, contactName = '') {
    if (!node?.querySelectorAll) return false;
    const contact = canonicalPersonName(contactName);
    const markers = [
      ...node.querySelectorAll('a[href*="/in/"], img[alt], [data-anonymize="person-name"], [data-view-name*="sender"], [data-view-name*="author"]')
    ];
    for (const marker of markers) {
      const value = cleanPersonLabel(marker.innerText || marker.textContent || marker.getAttribute?.('alt') || marker.getAttribute?.('aria-label') || '');
      if (value && isCurrentUserName(value)) return false;
      if (contact && value && namesLikelyMatch(value, contactName)) return true;
      if (marker.matches?.('a[href*="/in/"]') && !isCurrentUserName(value)) return true;
    }
    return false;
  }

  function namesLikelyMatch(a, b) {
    const left = canonicalPersonName(a);
    const right = canonicalPersonName(b);
    if (!left || !right) return false;
    if (left === right) return true;
    const lp = left.split(' ');
    const rp = right.split(' ');
    return lp[0]?.length >= 3 && lp[0] === rp[0] && (lp.length === 1 || rp.length === 1 || lp.at(-1) === rp.at(-1));
  }

  function cleanPersonLabel(value) {
    return normalizeName(value)
      .replace(/\b(?:profile photo|photo|avatar|profile picture|online|active now)\b/gi, '')
      .replace(/^(?:view|open)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inferMessageDirectionFromLayout(node, root) {
    return getMessageLayoutMetrics(node, root).direction;
  }

  function getMessageLayoutMetrics(node, root) {
    const thread = root || node?.closest?.([
      '.msg-s-message-list',
      '.msg-s-message-list__scrollable',
      '.msg-thread',
      '.msg-convo-wrapper',
      '.msg-overlay-conversation-bubble',
      '[data-view-name*="message-list"]'
    ].join(','));
    if (!node || !thread) return { direction: 'unknown', lane: 'center', centerRatio: NaN };

    const threadRect = thread.getBoundingClientRect();
    if (!threadRect.width) return { direction: 'unknown', lane: 'center', centerRatio: NaN };

    const selector = [
      '.msg-s-message-list__message-bubble',
      '.msg-s-event-listitem__message-bubble',
      '.msg-s-event-listitem__body',
      '[data-view-name*="message-bubble"]',
      '[data-view-name*="message-body"]',
      '[class*="message-bubble"]',
      '[class*="message-body"]',
      '[dir="ltr"]',
      'p'
    ].join(',');
    const candidates = [];
    const addCandidate = (element) => {
      if (!element || candidates.includes(element)) return;
      const rect = element.getBoundingClientRect?.();
      if (!rect || rect.width < 8 || rect.height < 8) return;
      if (rect.right <= threadRect.left || rect.left >= threadRect.right) return;
      const candidateText = cleanConversationText(element.innerText || element.textContent || '');
      const nodeText = cleanConversationText(node.innerText || node.textContent || '');
      if (!candidateText || (nodeText && !nodeText.includes(candidateText) && !candidateText.includes(nodeText))) return;
      candidates.push(element);
    };

    if (node.matches?.(selector)) addCandidate(node);
    node.querySelectorAll?.(selector).forEach(addCandidate);
    let ancestor = node.parentElement;
    for (let depth = 0; ancestor && depth < 4 && ancestor !== thread; depth += 1, ancestor = ancestor.parentElement) addCandidate(ancestor);
    if (!candidates.length) addCandidate(node);

    let best = null;
    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      const widthRatio = rect.width / threadRect.width;
      const cssDirection = readCssDirectionSignal(candidate, thread);
      const centerRatio = (rect.left + rect.width / 2 - threadRect.left) / threadRect.width;
      const edgeDifference = Math.abs((rect.left - threadRect.left) - (threadRect.right - rect.right));
      const score = (cssDirection !== 'unknown' ? 500 : 0) +
        (widthRatio < 0.92 ? 220 : 0) +
        (widthRatio < 0.72 ? 120 : 0) +
        Math.min(edgeDifference, 180) -
        Math.abs(widthRatio - 0.48) * 30;
      if (!best || score > best.score) best = { candidate, rect, widthRatio, cssDirection, centerRatio, score };
    }

    if (!best) return { direction: 'unknown', lane: 'center', centerRatio: NaN };
    const leftGap = best.rect.left - threadRect.left;
    const rightGap = threadRect.right - best.rect.right;
    const lane = best.centerRatio > 0.54 ? 'right' : best.centerRatio < 0.46 ? 'left' : 'center';
    let direction = best.cssDirection;
    if (direction === 'unknown' && best.widthRatio < 0.96) {
      const requiredDifference = Math.max(8, threadRect.width * 0.025);
      if (leftGap - rightGap > requiredDifference) direction = 'self';
      else if (rightGap - leftGap > requiredDifference) direction = 'contact';
      else if (best.centerRatio >= 0.57) direction = 'self';
      else if (best.centerRatio <= 0.43) direction = 'contact';
    }

    return { direction, lane, centerRatio: best.centerRatio, leftGap, rightGap, widthRatio: best.widthRatio };
  }

  function readCssDirectionSignal(element, stopAt) {
    let current = element;
    for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
      const style = getComputedStyle(current);
      const parentStyle = current.parentElement ? getComputedStyle(current.parentElement) : null;
      const marginLeftAuto = style.marginLeft === 'auto';
      const marginRightAuto = style.marginRight === 'auto';
      const align = String(style.alignSelf || '').toLowerCase();
      const floatValue = String(style.cssFloat || style.float || '').toLowerCase();
      const parentJustify = String(parentStyle?.justifyContent || '').toLowerCase();

      if (marginLeftAuto && !marginRightAuto) return 'self';
      if (marginRightAuto && !marginLeftAuto) return 'contact';
      if (/flex-end|\bend\b|right/.test(align) || floatValue === 'right') return 'self';
      if (/flex-start|\bstart\b|left/.test(align) || floatValue === 'left') return 'contact';
      if (/flex-end|\bend\b|right/.test(parentJustify)) return 'self';
      if (/flex-start|\bstart\b|left/.test(parentJustify) && parentStyle?.display?.includes('flex')) return 'contact';
      if (current === stopAt) break;
    }
    return 'unknown';
  }

  function isCurrentUserName(value) {
    const sender = canonicalPersonName(value);
    if (!sender) return false;
    const candidates = [currentUserName, detectCurrentLinkedInUserName()]
      .map(canonicalPersonName)
      .filter(Boolean);

    return candidates.some((candidate) => {
      if (sender === candidate) return true;
      const senderParts = sender.split(' ');
      const candidateParts = candidate.split(' ');
      if (senderParts.length === 1 && sender.length >= 4 && candidateParts[0] === sender) return true;
      if (candidateParts.length === 1 && candidate.length >= 4 && senderParts[0] === candidate) return true;
      return false;
    });
  }

  function canonicalPersonName(value) {
    return normalizeName(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function detectCurrentLinkedInUserName() {
    const selectors = [
      'img.global-nav__me-photo[alt]',
      '.global-nav__me img[alt]',
      'button[aria-label*="Me"] img[alt]',
      '[data-control-name="identity_welcome_message"] [data-anonymize="person-name"]',
      '.feed-identity-module__actor-meta [data-anonymize="person-name"]'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = cleanPersonLabel(element?.getAttribute?.('alt') || element?.innerText || element?.textContent || '');
      if (value && !/^(me|profile photo|photo)$/i.test(value)) return value;
    }
    return '';
  }

  function extractConversationContext(rootOverride = null, rowOverride = null) {
    if (!isMessagingSurface()) return null;
    const root = rootOverride;
    if (!root || !isSafeConversationRootCandidate(root)) return null;
    const activeRow = rowOverride?.isConnected ? rowOverride : null;

    const messages = extractRecentConversationMessages(root, activeRow);
    if (!messages.length) return null;
    const transcript = messages
      .map(formatConversationMessage)
      .join('\n\n')
      .slice(-9000);
    const messageCount = messages.length;

    const participant = conversationParticipantDetails(root, activeRow);
    const name = participant.name || 'LinkedIn contact';
    const newest = messages.at(-1) || { sender: 'Contact', text: '' };
    const lastMessage = newest.text;

    return {
      mode: 'conversation',
      name,
      contactName: name,
      participantName: name,
      headline: lastMessage.slice(0, 240) || 'Latest visible LinkedIn message',
      role: participant.role,
      company: participant.company,
      location: participant.location,
      profileUrl: participant.profileUrl,
      userId: participant.userId,
      latestMessage: lastMessage.slice(0, 500),
      latestSender: newest.sender,
      latestDirection: newest.direction,
      description: transcript,
      rawText: transcript,
      messageCount,
      hasMinimumContext: messageCount >= MIN_CONVERSATION_MESSAGES,
      url: conversationUrl(activeRow),
      source: 'conversation-hover',
      capturedAtMs: Date.now(),
      detectorVersion: CONTENT_SCRIPT_VERSION
    };
  }

  function extractConversationPreviewContext(row) {
    if (!row) return null;
    const preview = extractConversationRowPreview(row);
    if (!preview) return null;
    const lines = preview.split(/\n+/).map(clean).filter(Boolean);
    const participant = conversationParticipantDetails(null, row);
    const name = participant.name || normalizeName(lines[0] || '') || 'LinkedIn contact';
    const rawSnippet = extractConversationRowSnippet(row) || lines.slice(1).join(' ') || lines[0];
    const direction = conversationRowLatestDirection(row);
    const sentByUser = direction === 'self';
    const snippet = rawSnippet.replace(/^(?:you|me)\s*[:·-]\s*/i, '').trim();
    return {
      mode: 'conversation',
      name,
      contactName: name,
      participantName: name,
      headline: snippet.slice(0, 240) || 'Visible conversation preview',
      role: participant.role,
      company: participant.company,
      location: participant.location,
      profileUrl: participant.profileUrl,
      userId: participant.userId,
      latestMessage: snippet.slice(0, 500),
      latestSender: sentByUser ? 'You' : name,
      latestDirection: sentByUser ? 'self' : 'contact',
      description: sentByUser ? `[YOU]: ${snippet}` : `[CONTACT - ${name}]: ${snippet}`,
      rawText: preview,
      messageCount: 1,
      url: conversationUrl(row),
      source: 'conversation-preview-hover',
      capturedAtMs: Date.now(),
      detectorVersion: CONTENT_SCRIPT_VERSION
    };
  }

  function conversationParticipantDetails(root, row) {
    const scope = findConversationOuterShell(root) || root || row || null;
    const headerScope = scope?.querySelector?.('.msg-overlay-bubble-header, .msg-thread__top-card, .msg-entity-lockup, [data-view-name*="conversation-header"], header') || scope;
    const name = conversationParticipantName(root, row) || '';
    const role = clean(firstText(headerScope, [
      '.msg-entity-lockup__entity-subtitle',
      '.artdeco-entity-lockup__subtitle',
      '.msg-thread__participant-info',
      '[data-anonymize="headline"]'
    ]));
    const locationText = clean(firstText(headerScope, [
      '.artdeco-entity-lockup__caption',
      '.msg-entity-lockup__entity-caption',
      '[data-anonymize="location"]'
    ]));
    const profileLink = headerScope?.querySelector?.(
      '.msg-thread__link-to-profile[href*="/in/"], .msg-entity-lockup__entity-title a[href*="/in/"], a[href*="/in/"]'
    ) || row?.querySelector?.('a[href*="/in/"]');
    const profileUrl = normalizeLinkedInUrl(profileLink?.href || profileLink?.getAttribute?.('href') || '');
    const userId = (() => {
      try {
        return decodeURIComponent(new URL(profileUrl).pathname.match(/\/in\/([^/?#]+)/i)?.[1] || '');
      } catch (_) {
        return '';
      }
    })();
    return {
      name,
      contactName: name,
      participantName: name,
      role,
      company: inferCompany(role),
      location: locationText,
      profileUrl,
      userId
    };
  }

  function extractConversationNameFromAria(scope) {
    if (!scope?.querySelectorAll) return '';
    const root = scope;
    const nodes = [root, ...root.querySelectorAll?.([
      '[aria-label*="conversation with" i]',
      '[aria-label*="messages with" i]',
      '[aria-label*="messaging with" i]',
      '[aria-label*="chat with" i]'
    ].join(',')) || []];
    for (const node of nodes) {
      const label = clean(node?.getAttribute?.('aria-label') || '');
      const match = label.match(/(?:conversation|messages|messaging|chat)\s+with\s+(.+?)(?:[,|]|$)/i);
      const value = cleanPersonLabel(match?.[1] || '');
      if (value && !/^(?:messaging|conversation|messages|chat)$/i.test(value)) return value;
    }
    return '';
  }

  function conversationParticipantName(root, row) {
    const scopedRoot = findConversationOuterShell(root) || root || null;

    const rowName = row ? normalizeName(firstText(row, [
      '.msg-conversation-listitem__participant-names',
      '.msg-conversation-card__participant-names',
      '[data-anonymize="person-name"]',
      'h3',
      'strong'
    ])) : '';
    if (rowName && !/^messaging$/i.test(rowName) && !isCurrentUserName(rowName)) return rowName;

    const ariaName = scopedRoot ? extractConversationNameFromAria(scopedRoot) : '';
    if (ariaName && !namesLikelyMatch(ariaName, currentUserName)) return ariaName;

    if (!scopedRoot) return '';
    const headerScope = scopedRoot.querySelector?.('.msg-overlay-bubble-header, .msg-thread__top-card, .msg-entity-lockup, [data-view-name*="conversation-header"], header') || scopedRoot;
    const scopedName = normalizeName(firstText(headerScope, [
      '.msg-overlay-bubble-header__title',
      '.msg-entity-lockup__entity-title',
      '.msg-thread__link-to-profile',
      '[data-view-name*="conversation-header"] [data-anonymize="person-name"]',
      '[data-anonymize="person-name"]',
      'a[href*="/in/"]',
      'h2',
      'h3'
    ]));
    if (scopedName && !/^messaging$/i.test(scopedName) && !isCurrentUserName(scopedName)) return scopedName;
    return '';
  }


  function conversationUrl(row) {
    const link = row?.matches?.('a[href*="/messaging/"]') ? row : row?.querySelector?.('a[href*="/messaging/"]');
    return normalizeLinkedInUrl(link?.href || location.href);
  }

  function cleanConversationText(value) {
    return clean(value)
      .split(/\n+/)
      .map(clean)
      .filter((line) => line && !isConversationNoiseLine(line))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isConversationNoiseLine(line) {
    return /^(seen|delivered|sent|read|typing…?|search messages|new message|details|more|today|yesterday)$/i.test(line) ||
      /^\d{1,2}:\d{2}(?:\s*[ap]m)?$/i.test(line) ||
      /^(mon|tue|wed|thu|fri|sat|sun)(?:day)?$/i.test(line);
  }

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function createAutopilotController(runId, settings, resumeFile = null, previousDraftProfileIds = [], previousCheckedProfileIds = [], startProfileId = '', startProfileName = '') {
    const normalized = normalizeAutopilotSettings(settings);
    const startedAtMs = Date.now();
    const totalWindowMs = 0;
    const intervalMs = 0;
    return {
      runId: String(runId || `ib-${Date.now()}`),
      settings: normalized,
      resumeFile: resumeFile && resumeFile.base64 && resumeFile.name ? resumeFile : null,
      status: 'starting',
      paused: false,
      stopped: false,
      startedAt: new Date(startedAtMs).toISOString(),
      startedAtMs,
      totalWindowMs,
      deadlineAtMs: startedAtMs + totalWindowMs,
      finishedAt: null,
      current: { profileId: '', profileName: '', detectedTitle: '', action: 'Starting Autopilot' },
      progress: { checked: 0, matched: 0, skipped: 0, draftsPrepared: 0, errors: 0 },
      processed: new Set(),
      previouslyDrafted: new Set((Array.isArray(previousDraftProfileIds) ? previousDraftProfileIds : []).map((id) => String(id || '').trim().toLowerCase()).filter(Boolean)),
      previouslyChecked: new Set((Array.isArray(previousCheckedProfileIds) ? previousCheckedProfileIds : []).map((id) => String(id || '').trim().toLowerCase()).filter(Boolean)),
      companyDraftCounts: new Map(),
      consecutiveErrors: 0,
      failedProfiles: [],
      diagnosticCounts: {},
      lastDiagnostic: '',
      lastDiagnosticCode: '',
      lastError: '',
      lastErrorCode: '',
      rootCauseCode: '',
      rootCauseMessage: '',
      noNewRounds: 0,
      intervalMs,
      nextAllowedAt: 0,
      startProfileId: String(startProfileId || '').trim().toLowerCase(),
      startProfileName: clean(startProfileName || ''),
      startPointApplied: !String(startProfileId || '').trim(),
      startCard: null,
      memoryQueue: [],
      memoryFlushTimer: null,
      memoryFlushPromise: null,
      lastStatePublishAt: 0,
      lastPublishedStatus: ''
    };
  }

  function normalizeAutopilotSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    const roles = Array.isArray(source.desiredRoles)
      ? source.desiredRoles
      : String(source.desiredRole || '').split(/[;,\n]+/);
    const desiredRoles = [...new Set(roles.map((item) => clean(item)).filter(Boolean))].slice(0, 3);
    return {
      selectionMode: ['all_connections', 'hiring_contacts', 'custom_titles'].includes(source.selectionMode)
        ? source.selectionMode
        : 'all_connections',
      targetTags: normalizeAutopilotList(source.targetTags),
      targetTitles: normalizeAutopilotList(source.targetTitles),
      includeTitleKeywords: normalizeAutopilotList(source.includeTitleKeywords || source.includeTitles),
      excludeKeywords: normalizeAutopilotList(source.excludeKeywords || source.excludeTitles),
      companyKeywords: normalizeAutopilotList(source.companyKeywords || source.targetCompanies),
      locationKeywords: normalizeAutopilotList(source.locationKeywords || source.targetLocations),
      desiredRoles: desiredRoles.length ? desiredRoles : ['AI Engineer'],
      exactTitleOnly: false,
      draftLimit: Math.max(1, Math.min(20, Number(source.draftLimit || 5))),
      timeSpanMinutes: 5,
      minMatchScore: [35, 65, 100].includes(Number(source.minMatchScore)) ? Number(source.minMatchScore) : 65,
      maxDraftsPerCompany: Math.max(1, Math.min(10, Number(source.maxDraftsPerCompany || 2))),
      consecutiveErrorLimit: Math.max(1, Math.min(10, Number(source.consecutiveErrorLimit || 3))),
      connectionsOnly: source.connectionsOnly !== false,
      skipPreviouslyDrafted: source.skipPreviouslyDrafted !== false,
      skipPreviouslyChecked: source.skipPreviouslyChecked !== false,
      skipExistingDraft: source.skipExistingDraft !== false,
      skipExistingConversation: source.skipExistingConversation === true,
      attachResume: true,
      skipDuplicates: source.skipDuplicates !== false,
      stopOnRecipientFailure: source.stopOnRecipientFailure !== false,
      stopOnProviderFailure: false,
      minimiseComposer: true,
      fastMode: true,
      highlightCurrentCard: source.highlightCurrentCard !== false,
      vibe: ['professional', 'neutral', 'engaging'].includes(source.vibe) ? source.vibe : 'professional',
      length: ['short', 'medium', 'long'].includes(source.length) ? source.length : 'medium'
    };
  }


  function normalizeAutopilotList(value) {
    const items = Array.isArray(value) ? value : String(value || '').split(/[,;\n]+/);
    return [...new Set(items.map((item) => clean(item)).filter(Boolean))].slice(0, 50);
  }

  function autopilotState(controller, overrides = {}) {
    return {
      runId: controller.runId,
      status: overrides.status || controller.status,
      tabId: null,
      startedAt: controller.startedAt,
      finishedAt: overrides.finishedAt ?? controller.finishedAt,
      nextDraftAt: controller.nextAllowedAt ? new Date(controller.nextAllowedAt).toISOString() : null,
      queueSize: 0,
      current: { ...controller.current },
      progress: { ...controller.progress },
      processedProfiles: [...controller.processed].slice(-500),
      failedProfiles: controller.failedProfiles.slice(-200),
      diagnosticCounts: { ...controller.diagnosticCounts },
      lastDiagnostic: overrides.lastDiagnostic ?? controller.lastDiagnostic,
      lastDiagnosticCode: overrides.lastDiagnosticCode ?? controller.lastDiagnosticCode,
      lastError: overrides.lastError ?? controller.lastError,
      lastErrorCode: overrides.lastErrorCode ?? controller.lastErrorCode,
      rootCauseCode: overrides.rootCauseCode ?? controller.rootCauseCode,
      rootCauseMessage: overrides.rootCauseMessage ?? controller.rootCauseMessage
    };
  }

  async function publishAutopilotState(controller, overrides = {}) {
    const now = Date.now();
    const status = overrides.status || controller.status;
    const action = clean(controller.current?.action || '');
    const force = Boolean(overrides.finishedAt || overrides.lastError || overrides.lastErrorCode) ||
      status !== controller.lastPublishedStatus ||
      /^(Message prepared|Failed|Stopped|Paused|Message target reached|Scan finished)/i.test(action);
    if (!force && now - Number(controller.lastStatePublishAt || 0) < 160) return;
    controller.lastStatePublishAt = now;
    controller.lastPublishedStatus = status;
    try {
      await chrome.runtime.sendMessage({
        type: 'AUTOPILOT_STATE_UPDATE',
        state: autopilotState(controller, overrides)
      });
    } catch (_) {}
  }

  async function sendAutopilotEvent(controller, event) {
    try {
      await chrome.runtime.sendMessage({
        type: 'AUTOPILOT_EVENT',
        runId: controller.runId,
        event: { at: new Date().toISOString(), ...event }
      });
    } catch (_) {}
  }

  async function rememberAutopilotProfile(controller, profile, id, outcome, code = '', reason = '') {
    const profileId = String(id || autopilotProfileId(profile) || '').trim().toLowerCase();
    if (!profileId) return;
    controller.previouslyChecked.add(profileId);
    controller.memoryQueue.push({
      profileId,
      profileName: profile?.name || '',
      headline: profile?.headline || '',
      company: profile?.company || '',
      outcome,
      code,
      reason,
      checkedAt: new Date().toISOString()
    });

    if (outcome === 'saved' || controller.memoryQueue.length >= 12) {
      await flushAutopilotProfileMemory(controller);
      return;
    }
    if (!controller.memoryFlushTimer) {
      controller.memoryFlushTimer = setTimeout(() => {
        controller.memoryFlushTimer = null;
        void flushAutopilotProfileMemory(controller);
      }, 350);
    }
  }

  async function flushAutopilotProfileMemory(controller) {
    if (controller.memoryFlushTimer) {
      clearTimeout(controller.memoryFlushTimer);
      controller.memoryFlushTimer = null;
    }
    if (!controller.memoryQueue.length) return controller.memoryFlushPromise;
    const records = controller.memoryQueue.splice(0, controller.memoryQueue.length);
    const send = async () => {
      try {
        await chrome.runtime.sendMessage({
          type: 'AUTOPILOT_PROFILE_MEMORY_BATCH',
          runId: controller.runId,
          records
        });
      } catch (_) {
        controller.memoryQueue.unshift(...records);
      }
    };
    controller.memoryFlushPromise = Promise.resolve(controller.memoryFlushPromise).then(send, send);
    await controller.memoryFlushPromise;
  }

  function autopilotDiagnosticMessage(code, detail = '') {
    const base = AUTOPILOT_DIAGNOSTICS[code] || 'Autopilot recorded a diagnostic event.';
    return clean(detail) ? `${base} ${clean(detail)}` : base;
  }

  async function recordAutopilotDiagnostic(controller, code, profileName = '', detail = '', level = 'warning') {
    const message = autopilotDiagnosticMessage(code, detail);
    controller.diagnosticCounts[code] = Number(controller.diagnosticCounts[code] || 0) + 1;
    controller.lastDiagnosticCode = code;
    controller.lastDiagnostic = message;
    await sendAutopilotEvent(controller, { level, code, message, profileName });
    return message;
  }

  function standardizeAutopilotError(error, fallbackCode = 'AP-E999') {
    const originalCode = clean(error?.code || '');
    if (/^AP-E\d{3}$/.test(originalCode)) return error;
    let code = fallbackCode;
    if (/AI|OLLAMA|OPENROUTER|GROQ|PROVIDER|TIMEOUT|HTTP/i.test(originalCode)) code = 'AP-E201';
    else if (/RECIPIENT/i.test(originalCode)) code = 'AP-E203';
    else if (/COMPOSER-OPEN/i.test(originalCode)) code = 'AP-E202';
    else if (/COMPOSER|EDITOR/i.test(originalCode)) code = 'AP-E204';
    else if (/INSERT/i.test(originalCode)) code = 'AP-E205';
    else if (/FILE-INPUT/i.test(originalCode)) code = 'AP-E211';
    else if (/FILE-INJECT/i.test(originalCode)) code = 'AP-E212';
    else if (/UPLOAD|ATTACH-CONFIRM/i.test(originalCode)) code = 'AP-E213';
    else if (/DRAFT-PERSIST/i.test(originalCode)) code = 'AP-E214';
    else if (/STALE-COMPOSER|WRONG-COMPOSER/i.test(originalCode)) code = 'AP-E215';
    else if (/STALE-ACTION/i.test(originalCode)) code = 'AP-E216';
    else if (/RESUME|ATTACH/i.test(originalCode)) code = 'AP-E207';
    else if (/DRAFT-VERIFY/i.test(originalCode)) code = 'AP-E208';
    else if (/429|RATE|THROTTLE|BLOCK/i.test(`${originalCode} ${error?.message || ''}`)) code = 'AP-E209';
    const detail = originalCode ? `Original code: ${originalCode}.` : '';
    const wrapped = new Error(`${autopilotDiagnosticMessage(code)} ${detail} ${clean(error?.message || '')}`.trim());
    wrapped.code = code;
    wrapped.causeCode = originalCode;
    return wrapped;
  }

  async function runAutopilot(controller) {
    try {
      controller.status = 'running';
      controller.current.action = 'Scanning visible LinkedIn connections';
      await publishAutopilotState(controller);
      await sendAutopilotEvent(controller, { level: 'info', code: 'RUN_STARTED', message: `Connections Autopilot will continue scanning until ${controller.settings.draftLimit} successful same-page messages are prepared. Fast mode continues immediately after each verified draft and résumé attachment.` });

      while (!controller.stopped && controller.progress.draftsPrepared < controller.settings.draftLimit) {
        await waitForAutopilotResume(controller);
        if (controller.stopped) break;

        let cards = discoverAutopilotProfileCards();
        cards = applyAutopilotStartPoint(controller, cards);
        const pending = cards.filter(({ id }) => !controller.processed.has(id) && !(controller.settings.skipPreviouslyChecked && controller.previouslyChecked.has(String(id || '').toLowerCase())));

        if (!pending.length) {
          controller.current.action = 'Loading more LinkedIn connection cards';
          await publishAutopilotState(controller);
          const loadResult = await advanceAutopilotResults(controller, cards.length);
          if (loadResult.loaded) {
            controller.noNewRounds = 0;
            continue;
          }
          controller.noNewRounds += 1;
          if (controller.noNewRounds >= 4) break;
          await sleep(220);
          continue;
        }

        controller.noNewRounds = 0;
        for (const item of pending) {
          if (controller.stopped || controller.progress.draftsPrepared >= controller.settings.draftLimit) break;
          await waitForAutopilotResume(controller);
          if (controller.stopped) break;
          await processAutopilotProfile(controller, item);
        }
      }

      if (controller.stopped) return;
      await flushAutopilotProfileMemory(controller);
      controller.status = 'completed';
      controller.finishedAt = new Date().toISOString();
      if (controller.progress.draftsPrepared >= controller.settings.draftLimit) {
        controller.current.action = 'Message target reached — review the prepared LinkedIn messages';
      } else {
        const detail = `Scanned ${controller.progress.checked} cards, matched ${controller.progress.matched}, and saved ${controller.progress.draftsPrepared} drafts.`;
        controller.current.action = `Scan finished — ${detail} Open Drafts & Settings → Diagnostics for every skip reason.`;
        await recordAutopilotDiagnostic(controller, 'AP-W001', controller.current.profileName, detail, 'warning');
      }
      await publishAutopilotState(controller, { finishedAt: controller.finishedAt });
      await sendAutopilotEvent(controller, { level: 'success', code: 'RUN_COMPLETED', message: controller.current.action });
    } catch (rawError) {
      await flushAutopilotProfileMemory(controller);
      const error = standardizeAutopilotError(rawError);
      controller.status = 'error';
      controller.finishedAt = new Date().toISOString();
      controller.lastError = error.message || 'Autopilot stopped because of an unexpected error.';
      controller.lastErrorCode = error.code || 'AP-E999';
      if (controller.lastErrorCode === 'AP-E301' && (error.rootCauseCode || controller.rootCauseCode)) {
        controller.rootCauseCode = error.rootCauseCode || controller.rootCauseCode;
        controller.rootCauseMessage = error.rootCauseMessage || controller.rootCauseMessage || autopilotDiagnosticMessage(controller.rootCauseCode);
        controller.lastDiagnostic = controller.rootCauseMessage;
        controller.lastDiagnosticCode = controller.rootCauseCode;
      } else {
        controller.lastDiagnostic = controller.lastError;
        controller.lastDiagnosticCode = controller.lastErrorCode;
      }
      controller.current.action = `Stopped: ${controller.lastErrorCode}${controller.rootCauseCode ? ` · root cause ${controller.rootCauseCode}` : ''}`;
      await publishAutopilotState(controller, { finishedAt: controller.finishedAt, lastError: controller.lastError, lastErrorCode: controller.lastErrorCode, lastDiagnostic: controller.lastDiagnostic, lastDiagnosticCode: controller.lastDiagnosticCode, rootCauseCode: controller.rootCauseCode, rootCauseMessage: controller.rootCauseMessage });
      await sendAutopilotEvent(controller, { level: 'error', code: controller.lastErrorCode, message: controller.lastError, profileName: controller.current.profileName });
    }
  }

  function applyAutopilotStartPoint(controller, cards) {
    if (controller.startPointApplied || !controller.startProfileId) return cards;
    let index = controller.startCard?.isConnected
      ? cards.findIndex(({ card }) => card === controller.startCard || card.contains?.(controller.startCard) || controller.startCard.contains?.(card))
      : -1;
    if (index < 0) index = cards.findIndex(({ id }) => String(id || '').trim().toLowerCase() === controller.startProfileId);
    if (index < 0 && controller.startProfileName) {
      const expectedName = normalizeMatchValue(controller.startProfileName);
      index = cards.findIndex(({ profile }) => normalizeMatchValue(profile?.name || '') === expectedName);
    }
    if (index < 0) {
      controller.startPointApplied = true;
      controller.current.action = 'Hovered start card changed — continuing from the first currently visible connection';
      return cards;
    }
    for (const item of cards.slice(0, index)) controller.processed.add(item.id);
    controller.startPointApplied = true;
    controller.current = {
      profileId: controller.startProfileId,
      profileName: controller.startProfileName || cards[index]?.profile?.name || '',
      detectedTitle: cards[index]?.profile?.headline || '',
      action: `Starting from ${controller.startProfileName || cards[index]?.profile?.name || 'the hovered connection'}`
    };
    return cards.slice(index);
  }

  async function advanceAutopilotResults(controller, previousCount) {
    const main = document.querySelector('main') || document.body;
    const beforeHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
    const exactLabels = /^(show more results|show more|load more|see more connections|see more results)$/i;
    const loadMore = [...main.querySelectorAll('button, [role="button"]')].find((element) => {
      if (!isVisible(element) || element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
      const label = clean(`${element.innerText || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`);
      return exactLabels.test(label);
    });
    if (loadMore) {
      try {
        loadMore.scrollIntoView({ block: 'center', behavior: 'auto' });
        await sleep(70);
        loadMore.click();
      } catch (_) {}
    }

    const cards = discoverAutopilotProfileCards();
    const lastCard = cards[cards.length - 1]?.card;
    if (lastCard) {
      try { lastCard.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' }); } catch (_) {}
    }

    const scrollTargets = new Set([document.scrollingElement, document.documentElement, document.body, main]);
    let ancestor = lastCard?.parentElement;
    for (let depth = 0; ancestor && depth < 8; depth += 1, ancestor = ancestor.parentElement) scrollTargets.add(ancestor);
    for (const target of scrollTargets) {
      if (!target) continue;
      try {
        if (target.scrollHeight > target.clientHeight + 120) target.scrollTop = target.scrollHeight;
        target.dispatchEvent(new Event('scroll', { bubbles: true }));
      } catch (_) {}
    }
    try {
      window.scrollTo({ top: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0), behavior: 'auto' });
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 1400, bubbles: true }));
    } catch (_) {}

    const started = Date.now();
    while (!controller.stopped && Date.now() - started < 2600) {
      await waitForAutopilotResume(controller);
      const now = discoverAutopilotProfileCards();
      const nowHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
      const hasUnreviewedProfile = now.some(({ id }) => !controller.processed.has(id) && !(controller.settings.skipPreviouslyChecked && controller.previouslyChecked.has(String(id || '').toLowerCase())));
      if (now.length > previousCount || hasUnreviewedProfile || nowHeight > beforeHeight + 120) {
        return { loaded: true, count: now.length };
      }
      await sleep(120);
    }
    return { loaded: false, count: discoverAutopilotProfileCards().length };
  }

  async function waitForAutopilotResume(controller) {
    while (controller.paused && !controller.stopped) await sleep(120);
  }

  function nextAutopilotDraftSlot(_controller) {
    return Date.now();
  }

  async function waitForAutopilotDraftWindow(controller) {
    await waitForAutopilotResume(controller);
  }

  async function simulateAutopilotHover(card) {
    card.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    await sleep(55);
    const init = { bubbles: true, cancelable: true, view: window };
    try { card.dispatchEvent(new PointerEvent('pointerover', init)); } catch (_) {}
    card.dispatchEvent(new MouseEvent('mouseover', init));
    card.dispatchEvent(new MouseEvent('mouseenter', { ...init, bubbles: false }));
    await sleep(70);
  }

  function discoverAutopilotProfileCards() {
    const seen = new Set();
    const results = [];
    for (const link of document.querySelectorAll(PROFILE_LINK_SELECTOR)) {
      if (!isUsableProfileLink(link)) continue;
      const card = findProfileCard(link);
      if (!card || card.closest('header, nav, .msg-overlay-conversation-bubble, .msg-convo-wrapper, [role="dialog"]') || !card.closest('main') || !document.contains(card)) continue;
      const profile = extractProfileFromCard(link, card);
      const id = autopilotProfileId(profile);
      if (!id || seen.has(id) || !profile.name) continue;
      const text = clean(card.innerText);
      if (text.length < 20 || text.length > 12000) continue;
      seen.add(id);
      results.push({ id, card, link, profile });
    }
    return results;
  }

  function autopilotProfileId(profile) {
    const url = normalizeLinkedInUrl(profile?.url || '');
    if (url) return url.toLowerCase();
    return [profile?.name, profile?.headline, profile?.company].map((part) => clean(part).toLowerCase()).filter(Boolean).join('|');
  }

  async function processAutopilotProfile(controller, item) {
    const { id, card } = item;
    if (!card?.isConnected) return;
    controller.processed.add(id);
    controller.progress.checked += 1;

    const profile = extractProfileFromCard(item.link, card);
    controller.current = {
      profileId: id,
      profileName: profile.name || item.profile.name,
      detectedTitle: profile.headline || '',
      action: 'Checking connection and hiring relevance'
    };
    if (controller.settings.highlightCurrentCard) card.classList.add('icebreaker-autopilot-active-card');
    await publishAutopilotState(controller);
    let openedComposerRoot = null;

    try {
      if (controller.settings.connectionsOnly && !isAutopilotConnectionCard(card, profile)) {
        controller.progress.skipped += 1;
        controller.current.action = 'Skipped — AP-S101';
        await recordAutopilotDiagnostic(controller, 'AP-S101', profile.name, profile.headline || '');
        await rememberAutopilotProfile(controller, profile, id, 'rejected', 'AP-S101', 'Not a supported 1st-degree connection card.');
        await publishAutopilotState(controller);
        return;
      }

      if (controller.settings.skipPreviouslyDrafted && controller.previouslyDrafted.has(id)) {
        controller.progress.skipped += 1;
        controller.current.action = 'Skipped — AP-S102';
        await recordAutopilotDiagnostic(controller, 'AP-S102', profile.name);
        await rememberAutopilotProfile(controller, profile, id, 'saved', 'AP-S102', 'A draft was already saved in an earlier run.');
        await publishAutopilotState(controller);
        return;
      }

      const match = matchAutopilotProfile(profile, controller.settings);
      if (!match.matched) {
        controller.progress.skipped += 1;
        const code = match.reason.startsWith('contact confidence') ? 'AP-S104' : 'AP-S103';
        controller.current.action = `Skipped — ${code}`;
        await recordAutopilotDiagnostic(controller, code, profile.name, `Detected text: ${profile.headline || profile.rawText.slice(0, 180) || 'unavailable'}. ${match.reason}`);
        await rememberAutopilotProfile(controller, profile, id, 'rejected', code, match.reason);
        await publishAutopilotState(controller);
        return;
      }

      controller.progress.matched += 1;
      controller.current.detectedTitle = profile.headline || match.reason;
      controller.current.action = `Matched ${match.reason}`;
      await publishAutopilotState(controller);

      const companyKey = normalizeMatchValue(profile.company || inferCompany(profile.headline) || '');
      const companyCount = companyKey ? Number(controller.companyDraftCounts.get(companyKey) || 0) : 0;
      if (companyKey && companyCount >= controller.settings.maxDraftsPerCompany) {
        controller.progress.skipped += 1;
        controller.current.action = 'Skipped — AP-S105';
        await recordAutopilotDiagnostic(controller, 'AP-S105', profile.name, profile.company || 'Company could not be extracted.');
        await rememberAutopilotProfile(controller, profile, id, 'rejected', 'AP-S105', 'Maximum drafts per company reached.');
        await publishAutopilotState(controller);
        return;
      }

      controller.current.action = `Matched ${match.reason} — waiting for draft slot`;
      await publishAutopilotState(controller);
      await waitForAutopilotDraftWindow(controller);
      if (controller.stopped) return;

      controller.current.action = 'Reading the selected connection card';
      await publishAutopilotState(controller);
      await simulateAutopilotHover(card);

      // Generate first, then resolve and activate LinkedIn's Message control immediately.
      // This avoids keeping a temporary three-dot menu item alive while the AI request runs.
      controller.current.action = 'Generating the personalised IceBreaker message';
      await publishAutopilotState(controller);
      const generation = await chrome.runtime.sendMessage({
        type: 'GET_ICEBREAKER_MESSAGE_FOR_PROFILE',
        profile: { ...profile, mode: 'dms' }
      });
      if (!generation?.ok || !clean(generation.message)) {
        const error = new Error(generation?.error || 'IceBreaker did not produce a message.');
        error.code = 'AP-E201';
        error.causeCode = generation?.errorCode || 'E-AI';
        error.message = `${autopilotDiagnosticMessage('AP-E201')} Original code: ${error.causeCode}. ${error.message}`;
        throw error;
      }
      const generatedMessage = clean(generation.message);
      if (generation.fallbackUsed || generation.result?.fallbackUsed) {
        const fallbackReason = clean(generation.fallbackReason || generation.result?.fallbackReason || 'Cloud AI provider unavailable.');
        await recordAutopilotDiagnostic(controller, 'AP-W003', profile.name, fallbackReason, 'warning');
        controller.current.action = 'Local IceBreaker draft ready — opening the LinkedIn message field';
        await publishAutopilotState(controller);
      }

      controller.current.action = 'Opening the LinkedIn message field';
      await publishAutopilotState(controller);
      const messageAction = await resolveAutopilotMessageAction(card, profile.name);
      if (!messageAction) {
        controller.progress.skipped += 1;
        controller.current.action = 'Skipped — AP-S106';
        await recordAutopilotDiagnostic(controller, 'AP-S106', profile.name, `Matched as ${match.reason}.`);
        await rememberAutopilotProfile(controller, profile, id, 'failed', 'AP-S106', 'No usable LinkedIn Message action was found.');
        await publishAutopilotState(controller);
        return;
      }
      // v1.4.70: only use LinkedIn's visible same-page composer. The legacy
      // temporary direct-compose tab produced false-positive draft counts and
      // made the inserted text invisible to the user.

      const composerInfo = await openAutopilotComposer(card, profile, messageAction);
      openedComposerRoot = composerInfo.root;
      if (controller.stopped) return;

      controller.current.action = 'Verifying the opened message field';
      await publishAutopilotState(controller);
      const recipientVerified = composerInfo.recipientVerified || verifyAutopilotRecipient(composerInfo.root, profile);
      if (!recipientVerified && !composerInfo.trustedNewComposer) {
        const error = new Error(`Recipient verification failed for ${profile.name}. Nothing was pasted.`);
        error.code = 'AP-E203';
        throw error;
      }

      const composer = composerInfo.composer || findComposerInRoot(composerInfo.root);
      if (!composer) {
        const error = new Error('LinkedIn message editor was not found.');
        error.code = 'AP-E204';
        throw error;
      }

      if (controller.settings.skipExistingConversation && hasExistingLinkedInConversation(composerInfo.root)) {
        controller.progress.skipped += 1;
        controller.current.action = 'Skipped — AP-S107';
        await recordAutopilotDiagnostic(controller, 'AP-S107', profile.name);
        await rememberAutopilotProfile(controller, profile, id, 'rejected', 'AP-S107', 'An existing LinkedIn conversation was detected.');
        if (controller.settings.minimiseComposer) minimiseAutopilotComposer(composerInfo.root);
        await publishAutopilotState(controller);
        return;
      }

      if (controller.settings.skipExistingDraft && composerCurrentText(composer)) {
        controller.progress.skipped += 1;
        controller.current.action = 'Skipped — AP-S108';
        await recordAutopilotDiagnostic(controller, 'AP-S108', profile.name);
        await rememberAutopilotProfile(controller, profile, id, 'rejected', 'AP-S108', 'Existing message text was protected.');
        if (controller.settings.minimiseComposer) minimiseAutopilotComposer(composerInfo.root);
        await publishAutopilotState(controller);
        return;
      }

      controller.current.action = 'Pasting the IceBreaker message into the message field';
      await publishAutopilotState(controller);
      await insertAutopilotTextReliable(composer, generatedMessage);

      let resumeAttached = false;
      let attachmentWarning = '';
      if (controller.settings.attachResume && controller.resumeFile) {
        controller.current.action = `Attaching ${controller.resumeFile.label || controller.resumeFile.name}`;
        await publishAutopilotState(controller);
        try {
          await attachAutopilotResume(composerInfo.root, controller.resumeFile);
          resumeAttached = true;
        } catch (attachmentError) {
          const attachmentCode = /^AP-E\d{3}$/.test(String(attachmentError?.code || '')) ? attachmentError.code : 'AP-E207';
          try { clearAutopilotComposer(composer); } catch (_) {}
          const requiredAttachmentError = new Error(clean(attachmentError?.message || autopilotDiagnosticMessage(attachmentCode)));
          requiredAttachmentError.code = attachmentCode;
          throw requiredAttachmentError;
        }
      } else if (controller.settings.attachResume && !controller.resumeFile) {
        try { clearAutopilotComposer(composer); } catch (_) {}
        const missingResumeError = new Error('The saved résumé file is unavailable. The text was removed so no incomplete draft is counted.');
        missingResumeError.code = 'AP-E206';
        throw missingResumeError;
      }

      controller.current.action = 'Confirming the message remains in LinkedIn’s visible composer';
      await publishAutopilotState(controller);
      await persistAutopilotDraft(composerInfo.root, composer, generatedMessage);

      if (controller.settings.minimiseComposer) {
        minimiseAutopilotComposer(composerInfo.root);
        await sleep(90);
      }
      controller.progress.draftsPrepared += 1;
      controller.consecutiveErrors = 0;
      controller.previouslyDrafted.add(id);
      if (companyKey) controller.companyDraftCounts.set(companyKey, companyCount + 1);
      controller.lastError = '';
      controller.lastErrorCode = '';
      controller.lastDiagnostic = '';
      controller.lastDiagnosticCode = '';
      controller.rootCauseCode = '';
      controller.rootCauseMessage = '';
      controller.nextAllowedAt = nextAutopilotDraftSlot(controller);
      controller.current.action = 'Message prepared — moving to the next connection';
      await rememberAutopilotProfile(controller, profile, id, 'saved', 'DRAFT_SAVED', resumeAttached ? 'Message and résumé preserved in the visible LinkedIn composer.' : 'Message preserved in the visible LinkedIn composer; résumé was not confirmed.');
      await publishAutopilotState(controller);
      await sendAutopilotEvent(controller, {
        level: 'success',
        code: 'DRAFT_SAVED',
        message: resumeAttached
          ? 'The IceBreaker DM was pasted into the visible LinkedIn composer and the saved résumé was attached. Review it before sending.'
          : 'The IceBreaker DM was pasted into the visible LinkedIn composer. Résumé attachment was not confirmed, so review the message before sending.',
        profileName: profile.name,
        draft: {
          profileId: id,
          profileName: profile.name,
          profileUrl: profile.url || '',
          profileHeadline: profile.headline || '',
          profileCompany: profile.company || '',
          contactMatch: match.reason,
          desiredRole: controller.settings.desiredRoles?.[0] || '',
          resumeId: controller.resumeFile?.id || '',
          resumeName: controller.resumeFile?.label || controller.resumeFile?.name || '',
          message: generatedMessage,
          status: resumeAttached ? 'prepared-same-page-with-resume' : 'prepared-same-page-text-only',
          resumeAttached,
          attachmentWarning
        }
      });
      showBadge(card, 'Message prepared — review before sending');
      await sleep(90);
    } catch (rawError) {
      if (controller.stopped) return;
      const error = standardizeAutopilotError(rawError);
      const code = error.code || 'AP-E999';
      const recipientFailure = code === 'AP-E203';
      const providerFailure = code === 'AP-E201';
      if (openedComposerRoot && controller.settings.minimiseComposer) {
        try { minimiseAutopilotComposer(openedComposerRoot); } catch (_) {}
      }
      controller.progress.errors += 1;
      const blockingFailure = isBlockingAutopilotFailure(code, controller.settings);
      controller.consecutiveErrors = blockingFailure ? controller.consecutiveErrors + 1 : 0;
      const failureMessage = error.message || autopilotDiagnosticMessage(code);
      const failure = {
        id,
        name: profile.name || item.profile.name,
        code,
        causeCode: clean(error.causeCode || ''),
        stage: controller.current.action || 'Unknown stage',
        error: failureMessage,
        at: new Date().toISOString()
      };
      controller.failedProfiles.push(failure);
      controller.rootCauseCode = code;
      controller.rootCauseMessage = failureMessage;
      controller.lastError = failureMessage;
      controller.lastErrorCode = code;
      controller.lastDiagnostic = failureMessage;
      controller.lastDiagnosticCode = code;
      controller.diagnosticCounts[code] = Number(controller.diagnosticCounts[code] || 0) + 1;
      controller.current.action = `Failed: ${code}`;
      await rememberAutopilotProfile(controller, profile, id, 'failed', code, failureMessage);
      if (providerFailure && false) {
        controller.paused = true;
        controller.status = 'paused';
        controller.processed.delete(id);
        controller.current.action = `Paused: ${code}`;
      }
      await publishAutopilotState(controller, { lastError: controller.lastError, lastErrorCode: code, lastDiagnostic: controller.lastDiagnostic, lastDiagnosticCode: code });
      await sendAutopilotEvent(controller, { level: 'error', code, message: controller.lastError, profileName: profile.name || item.profile.name });
      showBadge(card, `${code} — skipped safely`);
      if (recipientFailure && controller.settings.stopOnRecipientFailure) {
        controller.status = 'error';
        controller.stopped = true;
        controller.finishedAt = new Date().toISOString();
        throw error;
      }
      if (blockingFailure && controller.consecutiveErrors >= controller.settings.consecutiveErrorLimit) {
        const recent = controller.failedProfiles.slice(-controller.settings.consecutiveErrorLimit)
          .map((failure) => `${failure.name || 'Unknown profile'} — ${failure.code}`)
          .join('; ');
        const limitError = new Error(`${autopilotDiagnosticMessage('AP-E301')} Root cause: ${code} — ${failureMessage} Recent failures: ${recent}.`);
        limitError.code = 'AP-E301';
        limitError.rootCauseCode = code;
        limitError.rootCauseMessage = failureMessage;
        controller.status = 'error';
        controller.stopped = true;
        controller.finishedAt = new Date().toISOString();
        throw limitError;
      }
    } finally {
      card.classList.remove('icebreaker-autopilot-active-card');
    }
  }

  function isBlockingAutopilotFailure(code, settings) {
    if (code === 'AP-E201') return false;
    if (code === 'AP-E203') return settings.stopOnRecipientFailure !== false;
    // Profile-specific LinkedIn composer failures are recoverable. They must never
    // stop the entire run or reduce the successful-draft target.
    return code === 'AP-E900' || code === 'AP-E999';
  }

  function isAutopilotConnectionCard(card, profile) {
    const path = location.pathname.toLowerCase();
    if (path.includes('/mynetwork/invite-connect/connections') || path.includes('/mynetwork/connections')) return true;

    const badgeText = clean([
      ...card.querySelectorAll('.entity-result__badge-text, .artdeco-entity-lockup__badge, [aria-label*="degree" i]')
    ].map((node) => `${node.innerText || ''} ${node.getAttribute?.('aria-label') || ''}`).join(' '));
    const normalized = normalizeMatchValue(`${badgeText} ${profile?.rawText || ''}`);
    if (/(^|\s)(1st|1st degree|first degree)(?=\s|$)/i.test(normalized)) return true;

    const controls = [...card.querySelectorAll('button, a[role="button"], a')].filter(isVisible);
    const hasMessage = controls.some((element) => {
      const label = normalizeMatchValue(`${element.innerText || ''} ${element.getAttribute('aria-label') || ''}`);
      return label === 'message' || label.startsWith('message ');
    });
    const hasConnect = controls.some((element) => {
      const label = normalizeMatchValue(`${element.innerText || ''} ${element.getAttribute('aria-label') || ''}`);
      return label === 'connect' || label.startsWith('connect ');
    });
    return hasMessage && !hasConnect;
  }

  function composerCurrentText(composer) {
    return clean(composer?.value || composer?.innerText || composer?.textContent || '');
  }

  function hasExistingLinkedInConversation(root) {
    const selectors = [
      '.msg-s-event-listitem',
      '.msg-s-message-group',
      '.msg-s-message-list__event',
      '[data-view-name="message-item"]',
      '.msg-s-message-list-container li'
    ];
    return selectors.some((selector) => [...root.querySelectorAll(selector)].some((node) => isVisible(node) && clean(node.innerText || node.textContent || '').length > 2));
  }

  const AUTOPILOT_CONTACT_RULES = [
    {
      category: 'Technical Recruiter',
      aliases: [
        'technical recruiter', 'tech recruiter', 'technology recruiter', 'it recruiter', 'software recruiter',
        'engineering recruiter', 'technical recruitment', 'tech recruitment', 'technical talent acquisition',
        'tech talent acquisition', 'technical sourcer', 'tech sourcer', 'engineering talent partner',
        'technology talent partner'
      ]
    },
    {
      category: 'Recruiter',
      aliases: [
        'recruiter', 'executive recruiter', 'recruitment consultant', 'recruiting consultant',
        'recruitment specialist', 'recruiting specialist', 'recruitment lead', 'recruiting lead',
        'recruitment coordinator', 'recruiting coordinator', 'recruitment officer', 'recruitment executive',
        'recruitment manager', 'recruiting manager', 'staffing specialist', 'staffing manager',
        'staffing consultant', 'staffing', 'executive search consultant', 'headhunter', 'talent sourcer',
        'sourcing recruiter', 'sourcer', 'talent recruiter', 'campus recruiter', 'university recruiter',
        'graduate recruiter', 'resourcing specialist', 'resourcing manager', 'recruitment and selection'
      ]
    },
    {
      category: 'Talent Acquisition',
      aliases: [
        'talent acquisition', 'talent acquisition partner', 'talent acquisition specialist',
        'talent acquisition lead', 'talent acquisition manager', 'talent acquisition director',
        'head of talent acquisition', 'talent partner', 'talent specialist', 'talent manager',
        'talent lead', 'head of talent', 'talent advisor', 'talent attraction', 'talent engagement'
      ]
    },
    {
      category: 'HR / People',
      aliases: [
        'human resources', 'human resource', 'hr', 'hr manager', 'hr director', 'hr executive', 'hr specialist',
        'hr professional', 'hr officer', 'hr coordinator', 'hr consultant', 'hr and admin', 'admin and hr',
        'hr business partner', 'hrbp', 'hr lead', 'head of hr', 'chief human resources officer', 'chro',
        'hr generalist', 'people operations', 'people operations manager', 'people ops', 'people partner', 'people and culture',
        'people culture', 'people experience', 'people success', 'people manager', 'people director',
        'head of people', 'chief people officer', 'employer branding', 'employee relations', 'learning and culture', 'learning culture',
        'learning and development', 'l and d', 'organizational development', 'organisation development',
        'head of od', 'od manager', 'od lead', 'employee experience', 'workplace culture'
      ]
    },
    {
      category: 'Hiring Manager',
      aliases: [
        'hiring manager', 'hiring lead', 'hiring partner', 'recruitment manager', 'recruiting manager',
        'talent acquisition manager', 'recruitment head', 'head of recruitment', 'hiring team lead'
      ]
    },
    {
      category: 'Founder / Executive',
      aliases: [
        'founder', 'co founder', 'cofounder', 'founding partner', 'startup founder',
        'chief executive officer', 'ceo', 'chief technology officer', 'cto',
        'managing director', 'business owner', 'company owner', 'owner and founder',
        'founder and ceo', 'co founder and ceo', 'founder and cto'
      ]
    },
    {
      category: 'Engineering Manager',
      aliases: [
        'engineering manager', 'software engineering manager', 'software development manager',
        'development manager', 'technical manager', 'head of engineering', 'head of software',
        'head of technology', 'head of ai', 'head of machine learning', 'head of data science',
        'director of engineering', 'director of software engineering', 'director of technology',
        'director of ai', 'director of machine learning', 'engineering director', 'technology director',
        'vp engineering', 'vp of engineering', 'vice president engineering', 'vice president of engineering',
        'vp technology', 'vp of technology', 'vp ai', 'vp of ai'
      ]
    },
    {
      category: 'Team / Technical Lead',
      aliases: [
        'team lead', 'technical lead', 'tech lead', 'engineering lead', 'software lead',
        'software team lead', 'development lead', 'lead engineer', 'lead software engineer',
        'ai lead', 'machine learning lead', 'ml lead', 'data science lead', 'technical team lead'
      ]
    },
    {
      category: 'Director / VP / Department Head',
      aliases: [
        'department head', 'head of department', 'business unit head', 'practice head', 'practice lead',
        'senior director', 'associate director', 'director', 'vice president', 'vp',
        'general manager', 'country manager', 'regional manager', 'delivery manager', 'program director',
        'product director', 'product lead', 'data director', 'research director', 'operations director'
      ]
    },
    {
      category: 'Active hiring signal',
      aliases: [
        'we are hiring', 'we re hiring', 'currently hiring', 'hiring now', 'join my team',
        'open roles', 'open positions', 'building my team', 'growing my team'
      ]
    }
  ];

  const AUTOPILOT_MATCH_FIELDS = [
    { key: 'headline', label: 'headline', weight: 100, limit: 500 },
    { key: 'description', label: 'description', weight: 65, limit: 1800 },
    { key: 'rawText', label: 'profile card', weight: 65, limit: 5000 }
  ];

  function matchAutopilotProfile(profile, settings) {
    const matches = [];
    const allProfileText = normalizeMatchValue([
      profile?.headline,
      profile?.company,
      profile?.location,
      profile?.description,
      profile?.rawText
    ].filter(Boolean).join(' '));

    const excluded = findAutopilotKeyword(allProfileText, settings.excludeKeywords);
    if (excluded) {
      return { matched: false, category: '', alias: excluded, source: '', score: 0, reason: `excluded phrase “${excluded}” matched` };
    }

    if (settings.companyKeywords.length) {
      const companyText = normalizeMatchValue(`${profile?.company || ''} ${profile?.headline || ''}`);
      const companyMatch = findAutopilotKeyword(companyText, settings.companyKeywords);
      if (!companyMatch) return { matched: false, category: '', alias: '', source: '', score: 0, reason: 'company filter did not match' };
    }

    if (settings.locationKeywords.length) {
      const locationText = normalizeMatchValue(profile?.location || '');
      const locationMatch = findAutopilotKeyword(locationText, settings.locationKeywords);
      if (!locationMatch) return { matched: false, category: '', alias: '', source: '', score: 0, reason: 'location filter did not match' };
    }

    const customTitles = [...new Set([
      ...(Array.isArray(settings.targetTitles) ? settings.targetTitles : []),
      ...(Array.isArray(settings.includeTitleKeywords) ? settings.includeTitleKeywords : [])
    ].map((item) => clean(item)).filter(Boolean))];

    const rules = [...AUTOPILOT_CONTACT_RULES];
    if (customTitles.length) {
      rules.push({ category: 'Custom target', aliases: customTitles });
    }

    // LinkedIn cards sometimes expose only a headline and sometimes a longer
    // summary. Evaluate both, but avoid unrelated mutual-connection snippets
    // when a real headline is available.
    const fields = clean(profile?.headline)
      ? AUTOPILOT_MATCH_FIELDS.filter((field) => field.key !== 'rawText')
      : AUTOPILOT_MATCH_FIELDS.map((field) => field.key === 'rawText' ? { ...field, weight: 75 } : field);

    for (const field of fields) {
      const text = normalizeMatchValue(String(profile?.[field.key] || '').slice(0, field.limit));
      if (!text) continue;

      for (const rule of rules) {
        for (const candidate of rule.aliases) {
          const alias = normalizeMatchValue(candidate);
          if (!phraseMatches(text, alias) || isNegatedRoleMention(text, alias)) continue;
          const specificity = Math.min(18, alias.split(' ').filter(Boolean).length * 3);
          matches.push({
            matched: true,
            category: rule.category,
            alias: candidate,
            source: field.label,
            score: field.weight + specificity,
            reason: `${rule.category} — ${candidate} in ${field.label}`
          });
        }
      }
    }

    const best = matches.sort((a, b) => b.score - a.score || b.alias.length - a.alias.length)[0] || null;
    const mode = ['all_connections', 'hiring_contacts', 'custom_titles'].includes(settings.selectionMode)
      ? settings.selectionMode
      : 'all_connections';

    if (mode === 'all_connections') {
      if (best) return best;
      const visibleTitle = clean(profile?.headline || profile?.description || 'visible LinkedIn connection');
      return {
        matched: true,
        category: 'Visible connection',
        alias: visibleTitle,
        source: clean(profile?.headline) ? 'headline' : 'profile card',
        score: 100,
        reason: `Visible connection — ${visibleTitle.slice(0, 120)}`
      };
    }

    if (mode === 'custom_titles') {
      if (!customTitles.length) {
        return { matched: false, category: '', alias: '', source: '', score: 0, reason: 'custom-title mode is selected but no target title or phrase is configured' };
      }
      const customMatch = matches
        .filter((item) => item.category === 'Custom target')
        .sort((a, b) => b.score - a.score || b.alias.length - a.alias.length)[0];
      if (!customMatch) {
        return { matched: false, category: '', alias: '', source: '', score: 0, reason: 'no configured custom title or phrase matched this connection' };
      }
      if (customMatch.score < settings.minMatchScore) {
        return { ...customMatch, matched: false, reason: `contact confidence ${customMatch.score} is below ${settings.minMatchScore}` };
      }
      return customMatch;
    }

    if (!best) {
      return {
        matched: false,
        category: '',
        alias: '',
        source: '',
        score: 0,
        reason: 'not classified as a hiring contact under the selected matching mode'
      };
    }

    if (best.score < settings.minMatchScore) {
      return { ...best, matched: false, reason: `contact confidence ${best.score} is below ${settings.minMatchScore}` };
    }
    return best;
  }

  function findAutopilotKeyword(normalizedText, keywords) {
    if (!normalizedText) return '';
    for (const keyword of Array.isArray(keywords) ? keywords : []) {
      const normalizedKeyword = normalizeMatchValue(keyword);
      if (normalizedKeyword && phraseMatches(normalizedText, normalizedKeyword)) return keyword;
    }
    return '';
  }

  function normalizeMatchValue(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\bc\s*[.\-_/]*\s*e\s*[.\-_/]*\s*o\b/g, 'ceo')
      .replace(/\bc\s*[.\-_/]*\s*t\s*[.\-_/]*\s*o\b/g, 'cto')
      .replace(/\bh\s*[.\-_/]*\s*r\b/g, 'hr')
      .replace(/\bl\s*[.&+\-_/]*\s*d\b/g, 'l and d')
      .replace(/&|\+/g, ' and ')
      .replace(/\bco\s*[=_.\-/]*\s*founder\b/g, 'co founder')
      .replace(/\bcofounder\b/g, 'co founder')
      .replace(/[^a-z0-9#]+/g, ' ')
      .replace(/\bof\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeAutopilotRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function phraseMatches(haystack, needle) {
    if (!needle || !haystack) return false;
    const escaped = needle
      .split(' ')
      .filter(Boolean)
      .map(escapeAutopilotRegex)
      .join('\\s+');
    return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'i').test(haystack);
  }

  function isNegatedRoleMention(text, alias) {
    const escaped = alias
      .split(' ')
      .filter(Boolean)
      .map(escapeAutopilotRegex)
      .join('\\s+');
    const negative = [
      `looking\\s+for(?:\\s+an?|\\s+the)?\\s+${escaped}`,
      `seeking(?:\\s+an?|\\s+the)?\\s+${escaped}`,
      `aspiring\\s+${escaped}`,
      `want(?:ing|s)?\\s+to\\s+be(?:come)?(?:\\s+an?)?\\s+${escaped}`,
      `connect(?:ing)?\\s+with(?:\\s+an?)?\\s+${escaped}`
    ];
    return negative.some((pattern) => new RegExp(`(^|\\s)${pattern}(?=\\s|$)`, 'i').test(text));
  }

  async function fillAutopilotDirectComposeTab(payload = {}) {
    const message = clean(payload.message || '');
    const profile = payload.profile || {};
    if (!message) {
      const error = new Error('The generated message was empty.');
      error.code = 'AP-E205';
      throw error;
    }

    const started = Date.now();
    let composer = null;
    let root = null;
    while (Date.now() - started < 22000) {
      const composers = findAllVisibleComposers(document);
      composer = composers[composers.length - 1] || findComposerFromActiveElement();
      if (composer) {
        root = composerRootFor(composer);
        break;
      }
      await sleep(220);
    }
    if (!composer) {
      const error = new Error('LinkedIn’s direct compose page loaded, but no usable message editor appeared.');
      error.code = 'AP-E218';
      throw error;
    }

    if (payload.skipExistingConversation === true && hasExistingLinkedInConversation(root || document)) {
      return { ok: false, code: 'AP-S107', skipped: true, error: 'An existing LinkedIn conversation was detected and protected.' };
    }
    if (payload.skipExistingDraft !== false && composerCurrentText(composer)) {
      return { ok: false, code: 'AP-S108', skipped: true, error: 'Existing message text was protected in the direct compose page.' };
    }

    await insertAutopilotTextReliable(composer, message);

    let resumeAttached = false;
    let attachmentWarning = '';
    if (payload.attachResume !== false && payload.resumeFile?.base64 && payload.resumeFile?.name) {
      try {
        await attachAutopilotResume(root || document, payload.resumeFile);
        resumeAttached = true;
      } catch (attachmentError) {
        const attachmentCode = /^AP-E\d{3}$/.test(String(attachmentError?.code || '')) ? attachmentError.code : 'AP-E207';
        attachmentWarning = `${attachmentCode}: ${clean(attachmentError?.message || autopilotDiagnosticMessage(attachmentCode))}`;
      }
    } else if (payload.attachResume !== false) {
      attachmentWarning = 'AP-E206: The saved résumé file was unavailable, so the text draft was preserved without an attachment.';
    }

    await persistAutopilotDraft(root || document, composer, message);
    try {
      composer.blur();
      document.body?.focus?.();
    } catch (_) {}
    await sleep(850);
    return {
      ok: true,
      draftSaved: true,
      recipientVerified: verifyAutopilotRecipient(root || document, profile) || /\/messaging\/compose\//i.test(location.pathname),
      resumeAttached,
      attachmentWarning
    };
  }

  async function openAutopilotComposer(card, profile, preparedAction = null) {
    const runStartedAt = Date.now();
    const initialUrl = location.href;
    const attemptNotes = [];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const beforeRoots = new Set(findVisibleComposerRoots());
      const beforeComposers = new Set(findAllVisibleComposers(document));
      let action = attempt === 0 ? preparedAction : null;
      if (!action || !action.isConnected || !isVisible(action)) {
        action = await resolveAutopilotMessageAction(card, profile.name);
      }
      if (!action) {
        attemptNotes.push(`attempt ${attempt + 1}: Message action not found`);
        await dismissAutopilotTransientUi();
        continue;
      }

      action.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      await sleep(55);
      try {
        await activateAutopilotMessageAction(action, attempt);
      } catch (cause) {
        attemptNotes.push(`attempt ${attempt + 1}: ${clean(cause?.message || 'activation failed')}`);
        await dismissAutopilotTransientUi();
        continue;
      }

      const result = await waitForAutopilotComposer(profile, beforeRoots, beforeComposers, {
        timeoutMs: attempt === 0 ? 4200 : 3200,
        initialUrl
      });
      if (result) return result;

      attemptNotes.push(`attempt ${attempt + 1}: no editor appeared`);
      await dismissAutopilotTransientUi();
      await sleep(120);
    }

    const error = new Error(`LinkedIn did not open a usable message editor for ${profile.name} after two activation methods. ${attemptNotes.join('; ')} Total wait: ${Math.round((Date.now() - runStartedAt) / 1000)}s.`);
    error.code = 'AP-E217';
    throw error;
  }

  async function activateAutopilotMessageAction(action, attempt) {
    if (!action?.isConnected) {
      const error = new Error('The Message action is no longer connected to the page.');
      error.code = 'AP-E216';
      throw error;
    }

    const clickable = action.closest?.('button, a, [role="button"], [role="menuitem"]') || action;
    clickable.focus?.({ preventScroll: true });

    if (attempt === 0) {
      if (typeof clickable.click === 'function') clickable.click();
      else HTMLElement.prototype.click.call(clickable);
      return;
    }

    if (attempt === 1) {
      const rect = clickable.getBoundingClientRect();
      const clientX = Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
      const clientY = Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
      const options = { bubbles: true, cancelable: true, composed: true, view: window, clientX, clientY, button: 0, buttons: 1 };
      try { clickable.dispatchEvent(new PointerEvent('pointerdown', { ...options, pointerId: 1, pointerType: 'mouse', isPrimary: true })); } catch (_) {}
      clickable.dispatchEvent(new MouseEvent('mousedown', options));
      try { clickable.dispatchEvent(new PointerEvent('pointerup', { ...options, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 })); } catch (_) {}
      clickable.dispatchEvent(new MouseEvent('mouseup', { ...options, buttons: 0 }));
      clickable.dispatchEvent(new MouseEvent('click', { ...options, buttons: 0 }));
      return;
    }

    const keyboardOptions = { bubbles: true, cancelable: true, composed: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 };
    clickable.dispatchEvent(new KeyboardEvent('keydown', keyboardOptions));
    clickable.dispatchEvent(new KeyboardEvent('keypress', keyboardOptions));
    clickable.dispatchEvent(new KeyboardEvent('keyup', keyboardOptions));
    await sleep(120);
    if (typeof clickable.click === 'function') clickable.click();
  }

  async function waitForAutopilotComposer(profile, beforeRoots, beforeComposers, options = {}) {
    const timeoutMs = Math.max(2500, Number(options.timeoutMs || 7000));
    const started = Date.now();
    let candidateSince = 0;
    let candidateRoot = null;
    let candidateComposer = null;

    while (Date.now() - started < timeoutMs) {
      const composers = findAllVisibleComposers(document);
      const roots = findVisibleComposerRoots();

      for (const root of roots) {
        const composer = findComposerInRoot(root);
        if (!composer) continue;
        if (verifyAutopilotRecipient(root, profile)) {
          return { root, composer, recipientVerified: true, trustedNewComposer: true };
        }
      }

      const newComposer = composers.find((composer) => !beforeComposers.has(composer));
      const newRoot = roots.find((root) => !beforeRoots.has(root));
      const activeComposer = findComposerFromActiveElement();
      const routeChangedToMessaging = location.href !== options.initialUrl && /\/messaging\//i.test(location.pathname);
      const selectedComposer = newComposer || (newRoot && findComposerInRoot(newRoot)) || activeComposer || (routeChangedToMessaging ? composers[0] : null);

      if (selectedComposer) {
        const root = composerRootFor(selectedComposer);
        if (root !== candidateRoot || selectedComposer !== candidateComposer) {
          candidateRoot = root;
          candidateComposer = selectedComposer;
          candidateSince = Date.now();
        }
        const recipientVerified = verifyAutopilotRecipient(root, profile);
        if (recipientVerified) {
          return {
            root,
            composer: selectedComposer,
            recipientVerified: true,
            trustedNewComposer: true
          };
        }

        const newlyOpenedEditors = composers.filter((item) => !beforeComposers.has(item));
        const newlyOpenedRoots = roots.filter((item) => !beforeRoots.has(item));
        const uniqueNewEditor = Boolean(newComposer) && newlyOpenedEditors.length === 1;
        const uniqueNewRoot = Boolean(newRoot) && newlyOpenedRoots.length === 1;
        const exactNewComposer = !beforeComposers.has(selectedComposer) && !beforeRoots.has(root) && (uniqueNewEditor || uniqueNewRoot);

        // Some LinkedIn layouts briefly render a brand-new editor before the
        // recipient heading. Trust only an exactly new, unique composer after
        // it has stabilised—not whichever old editor happens to be focused.
        if (exactNewComposer && !recipientEvidenceIsLoading(root) && Date.now() - candidateSince > 800) {
          return { root, composer: selectedComposer, recipientVerified: false, trustedNewComposer: true };
        }
      }
      await sleep(80);
    }
    return null;
  }

  function findComposerFromActiveElement() {
    const active = document.activeElement;
    if (!active) return null;
    if (isMessageComposerElement(active)) return active;
    const candidate = active.closest?.('[contenteditable="true"][role="textbox"], [contenteditable="plaintext-only"], textarea') || null;
    return candidate && isMessageComposerElement(candidate) ? candidate : null;
  }

  function composerRootFor(composer) {
    const selectors = [
      '.msg-overlay-conversation-bubble',
      '.msg-overlay-list-bubble',
      '.msg-convo-wrapper',
      '.msg-thread',
      '.msg-compose-form',
      '.msg-form',
      '[data-view-name="message-list"]',
      '[data-view-name*="message-overlay"]',
      '[data-view-name*="messaging"]',
      '[role="dialog"]',
      'form'
    ];
    return composer?.closest?.(selectors.join(', ')) || composer?.closest?.('section, aside, main') || document;
  }

  function isMessageComposerElement(element) {
    if (!element || !isVisible(element)) return false;
    if (element.matches?.('textarea[placeholder*="message" i], textarea[aria-label*="message" i]')) return true;
    if (!element.matches?.('[contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]')) return false;
    const metadata = clean(`${element.getAttribute?.('aria-label') || ''} ${element.getAttribute?.('data-placeholder') || ''} ${element.getAttribute?.('placeholder') || ''} ${element.className || ''}`);
    return /message|reply|write|type|compose|msg-form|contenteditable/i.test(metadata) || Boolean(element.closest?.('.msg-form, .msg-compose-form, [data-view-name*="messag"], .msg-overlay-conversation-bubble, .msg-convo-wrapper'));
  }

  async function dismissAutopilotTransientUi() {
    try {
      const openMenus = [...document.querySelectorAll('[role="menu"]')].filter(isVisible);
      if (openMenus.length) {
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27, which: 27 }));
        document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27, which: 27 }));
      }
    } catch (_) {}
    await sleep(60);
  }

  function recipientEvidenceIsLoading(root) {
    const text = normalizeMatchValue(clean(root?.innerText || root?.textContent || ''));
    return !text || /loading|fetching|new message/.test(text);
  }

  async function resolveAutopilotMessageAction(card, name) {
    const direct = findMessageAction(card, name);
    if (direct) return direct;

    const scopes = [];
    const seen = new Set();
    const addScope = (node) => {
      if (!node || seen.has(node) || !node.querySelector) return;
      seen.add(node);
      scopes.push(node);
    };
    addScope(card.closest('li, [role="listitem"], [data-view-name*="connection"], [data-view-name*="search-result"], .entity-result, .reusable-search__result-container'));
    let parent = card.parentElement;
    for (let depth = 0; parent && depth < 6; depth += 1, parent = parent.parentElement) addScope(parent);

    for (const scope of scopes) {
      const broader = findMessageAction(scope, name);
      if (broader) return broader;
    }

    const normalizedName = normalizeMatchValue(name);
    const nearbyCandidates = [...document.querySelectorAll('main button, main a[role="button"], main a')].filter((element) => {
      if (!isVisible(element) || element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
      const label = normalizeMatchValue(`${element.innerText || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`);
      if (!label.includes('message')) return false;
      if (normalizedName && label.includes(normalizedName)) return true;
      const owner = findProfileCard(element.closest(PROFILE_LINK_SELECTOR) || element.parentElement?.querySelector?.(PROFILE_LINK_SELECTOR));
      return Boolean(owner && (owner === card || owner.contains(card) || card.contains(owner)));
    });
    if (nearbyCandidates.length === 1) return nearbyCandidates[0];

    for (const scope of scopes) {
      const moreButton = [...scope.querySelectorAll('button, [role="button"]')].find((element) => {
        const label = clean(`${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''} ${element.innerText || ''}`);
        return /^(more|more actions|show more actions)$/i.test(label) || /more actions/i.test(label);
      });
      if (!moreButton) continue;
      moreButton.click();
      const started = Date.now();
      let menuAction = null;
      while (!menuAction && Date.now() - started < 850) {
        await sleep(70);
        const menuCandidates = [...document.querySelectorAll('[role="menuitem"], [role="menu"] button, [role="menu"] a, [data-view-name*="menu"] button')].filter(isVisible);
        menuAction = menuCandidates.find((element) => {
          const label = normalizeMatchValue(`${element.innerText || ''} ${element.getAttribute('aria-label') || ''}`);
          return label === 'message' || label.startsWith('message ') || label.includes('send message');
        }) || null;
      }
      if (menuAction) return menuAction;
      try { moreButton.click(); } catch (_) {}
    }
    return null;
  }

  function findMessageAction(card, name) {
    if (!card) return null;
    const normalizedName = normalizeMatchValue(name);
    const candidates = [...card.querySelectorAll('button, a[role="button"], a')]
      .filter((element) => {
        if (!isVisible(element) || element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
        const label = clean(`${element.innerText || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`);
        const normalized = normalizeMatchValue(label);
        if (!normalized.includes('message') || /message settings|messaging settings/i.test(label)) return false;
        return normalized === 'message' || normalized.startsWith('message ') || normalized.includes('send message') || normalized.includes('message to') || /messaging\/(?:thread|compose)/i.test(element.getAttribute('href') || '') || (!normalizedName || normalized.includes(normalizedName));
      })
      .sort((left, right) => messageActionScore(right, normalizedName) - messageActionScore(left, normalizedName));
    return candidates[0] || null;
  }

  function messageActionScore(element, normalizedName) {
    const label = normalizeMatchValue(`${element.innerText || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`);
    let score = element.tagName === 'BUTTON' ? 50 : 10;
    if (label === 'message') score += 50;
    if (label.startsWith('message ')) score += 20;
    if (normalizedName && label.includes(normalizedName)) score += 25;
    if (/messaging\/(?:thread|compose)/i.test(element.getAttribute('href') || '')) score -= 15;
    return score;
  }

  function findVisibleComposerRoots() {
    const roots = [];
    const add = (element) => {
      if (!element || roots.includes(element) || (element !== document && !isVisible(element)) || !findComposerInRoot(element)) return;
      roots.push(element);
    };
    const rootSelectors = [
      '.msg-overlay-conversation-bubble',
      '.msg-overlay-list-bubble',
      '.msg-convo-wrapper',
      '.msg-thread',
      '.msg-s-message-list-container',
      '[data-view-name="message-list"]',
      '[data-view-name*="message-overlay"]',
      '[data-view-name*="messaging"]',
      '.msg-compose-form',
      '.msg-form',
      '[role="dialog"]'
    ];
    for (const selector of rootSelectors) {
      for (const element of document.querySelectorAll(selector)) add(element);
    }
    const composers = findAllVisibleComposers(document);
    for (const composer of composers) {
      const root = composer.closest(rootSelectors.join(', ')) || composer.closest('section, aside, main') || document;
      add(root);
    }
    return roots;
  }

  function findAllVisibleComposers(root) {
    const selectors = [
      '.msg-form [contenteditable="true"][role="textbox"]',
      '.msg-form [contenteditable="true"]',
      '.msg-form__contenteditable[contenteditable="true"]',
      '[data-placeholder*="write a message" i][contenteditable="true"]',
      '[aria-label*="write a message" i][contenteditable="true"]',
      '[aria-label*="type a message" i][contenteditable="true"]',
      '[aria-label*="message" i][contenteditable="true"][role="textbox"]',
      '[contenteditable="plaintext-only"][role="textbox"]',
      '[data-lexical-editor="true"][contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="message" i]',
      'textarea[aria-label*="message" i]'
    ];
    const found = [];
    for (const selector of selectors) {
      for (const composer of root.querySelectorAll(selector)) {
        if (isVisible(composer) && !composer.closest('[aria-hidden="true"]') && isMessageComposerElement(composer) && !found.includes(composer)) found.push(composer);
      }
    }
    return found;
  }

  function findComposerInRoot(root) {
    return findAllVisibleComposers(root)[0] || null;
  }

  function verifyAutopilotRecipient(root, profile) {
    const expected = normalizeMatchValue(profile?.name || '');
    if (!expected) return false;
    const expectedUrl = normalizeLinkedInUrl(profile?.url || '').toLowerCase();
    const scope = root === document ? (findComposerInRoot(document)?.closest('.msg-overlay-conversation-bubble, .msg-overlay-list-bubble, .msg-convo-wrapper, .msg-thread, main') || document) : root;

    if (expectedUrl) {
      const matchingLink = [...scope.querySelectorAll(PROFILE_LINK_SELECTOR)].some((link) => normalizeLinkedInUrl(link.href || '').toLowerCase() === expectedUrl);
      if (matchingLink) return true;
    }

    const headerSelectors = [
      '.msg-overlay-bubble-header__title',
      '.msg-overlay-bubble-header__title a',
      '.msg-entity-lockup__entity-title',
      '.msg-thread__link-to-profile',
      '.msg-thread__link-to-profile span',
      '[data-anonymize="person-name"]',
      '[aria-label*="conversation with" i]',
      '[aria-label*="message to" i]',
      'header h1', 'header h2', 'header h3',
      'h1', 'h2', 'h3'
    ];
    const headerText = headerSelectors
      .flatMap((selector) => [...scope.querySelectorAll(selector)].map((element) => clean(`${element.innerText || element.textContent || ''} ${element.getAttribute?.('aria-label') || ''}`)))
      .filter(Boolean)
      .join(' ');
    const actual = normalizeMatchValue(headerText);
    if (actual.includes(expected)) return true;
    const tokens = expected.split(' ').filter((token) => token.length > 1);
    if (tokens.length >= 2 && actual.includes(tokens[0]) && actual.includes(tokens[tokens.length - 1])) return true;

    // Final fallback is restricted to the composer bubble itself, never the whole LinkedIn page.
    const bubbleText = normalizeMatchValue(clean(scope.innerText || scope.textContent || '').slice(0, 1800));
    return tokens.length >= 2 && bubbleText.includes(tokens[0]) && bubbleText.includes(tokens[tokens.length - 1]);
  }

  function selectAllComposerText(composer) {
    composer.focus();
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      try { composer.setSelectionRange(0, String(composer.value || '').length); } catch (_) {}
      return;
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function dispatchComposerInput(composer, value, inputType = 'insertText') {
    try {
      composer.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType,
        data: value
      }));
    } catch (_) {}
    try {
      composer.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType,
        data: value
      }));
    } catch (_) {
      composer.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    composer.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function insertAutopilotText(composer, text) {
    const value = String(text || '').trim();
    if (!value) throw new Error('The generated message is empty.');
    selectAllComposerText(composer);

    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      const prototype = composer instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(composer, value);
      else composer.value = value;
      dispatchComposerInput(composer, value, 'insertFromPaste');
      return;
    }

    let inserted = false;
    try { inserted = document.execCommand('insertText', false, value); } catch (_) {}
    if (!inserted || !composerCurrentText(composer)) {
      // LinkedIn currently uses both plain contenteditable and ProseMirror-like
      // editors. A paragraph node is the least destructive fallback for both.
      const paragraph = document.createElement('p');
      paragraph.textContent = value;
      composer.replaceChildren(paragraph);
      dispatchComposerInput(composer, value, 'insertFromPaste');
    } else {
      dispatchComposerInput(composer, value, 'insertText');
    }
  }

  async function insertAutopilotTextReliable(composer, text) {
    const value = String(text || '').trim();
    const attempts = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (attempt === 0) {
          insertAutopilotText(composer, value);
        } else if (attempt === 1) {
          selectAllComposerText(composer);
          const transfer = new DataTransfer();
          transfer.setData('text/plain', value);
          try {
            composer.dispatchEvent(new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              composed: true,
              clipboardData: transfer
            }));
          } catch (_) {}
          if (!composerContainsText(composer, value)) insertAutopilotText(composer, value);
        } else {
          selectAllComposerText(composer);
          try { document.execCommand('delete', false); } catch (_) {}
          const paragraph = document.createElement('p');
          paragraph.textContent = value;
          composer.replaceChildren(paragraph);
          dispatchComposerInput(composer, value, 'insertReplacementText');
          composer.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
          composer.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: value }));
          composer.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
        }
      } catch (error) {
        attempts.push(`attempt ${attempt + 1}: ${clean(error?.message || 'insertion failed')}`);
      }
      await sleep(120);
      if (composerContainsText(composer, value)) {
        composer.focus();
        return;
      }
      attempts.push(`attempt ${attempt + 1}: LinkedIn editor remained empty`);
    }
    const signature = clean(`${composer.tagName || ''} ${composer.className || ''} ${composer.getAttribute?.('aria-label') || ''} ${composer.getAttribute?.('data-placeholder') || ''}`).slice(0, 220);
    const error = new Error(`IceBreaker could not synchronise the generated text with LinkedIn’s active editor. ${attempts.join('; ')} Editor: ${signature || 'unknown'}.`);
    error.code = 'AP-E205';
    throw error;
  }

  function clearAutopilotComposer(composer) {
    if (!composer) return;
    selectAllComposerText(composer);
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      const prototype = composer instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) setter.call(composer, '');
      else composer.value = '';
    } else {
      composer.replaceChildren();
    }
    dispatchComposerInput(composer, '', 'deleteContentBackward');
  }

  function composerContainsText(composer, text) {
    const expected = clean(text).replace(/\s+/g, ' ');
    const actual = clean(composer.value || composer.innerText || composer.textContent || '').replace(/\s+/g, ' ');
    if (!expected || !actual) return false;
    if (actual === expected || actual.includes(expected)) return true;
    // LinkedIn occasionally normalises punctuation and whitespace in contenteditable fields.
    const normalise = (value) => normalizeMatchValue(value).replace(/\s+/g, ' ');
    const a = normalise(actual);
    const e = normalise(expected);
    return a === e || a.includes(e) || (e.length > 80 && a.includes(e.slice(0, 80)) && a.includes(e.slice(-60)));
  }

  async function attachAutopilotResume(root, resumeFile) {
    if (!resumeFile?.base64 || !resumeFile?.name) {
      const error = new Error('The selected résumé file is unavailable.');
      error.code = 'AP-E206';
      throw error;
    }

    const beforeMarkers = attachmentMarkers(root);
    const beforeInputs = new Set([...document.querySelectorAll('input[type="file"]')]);
    let input = findAutopilotFileInput(root, beforeInputs);
    if (!input) {
      const attachButton = findAutopilotAttachButton(root);
      if (attachButton) {
        try { attachButton.click(); } catch (_) {}
        const started = Date.now();
        while (!input && Date.now() - started < 1400) {
          await sleep(70);
          input = findAutopilotFileInput(root, beforeInputs);
        }
      }
    }
    if (!input) {
      const error = new Error('LinkedIn résumé attachment input was not found in or near the active composer.');
      error.code = 'AP-E211';
      throw error;
    }

    let bytes;
    try {
      bytes = Uint8Array.from(atob(resumeFile.base64), (character) => character.charCodeAt(0));
    } catch (cause) {
      const error = new Error(`The saved résumé data could not be decoded. ${clean(cause?.message || '')}`);
      error.code = 'AP-E206';
      throw error;
    }
    const file = new File([bytes], resumeFile.name, { type: resumeFile.type || 'application/octet-stream', lastModified: Date.now() });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    try {
      const filesSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set;
      if (filesSetter) filesSetter.call(input, transfer.files);
      else input.files = transfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    } catch (cause) {
      const error = new Error(`Chrome could not place the résumé into LinkedIn’s file input. ${clean(cause?.message || '')}`);
      error.code = 'AP-E212';
      throw error;
    }
    if (!input.files?.length || input.files[0]?.name !== resumeFile.name) {
      const error = new Error('The résumé file was not retained by LinkedIn’s file input.');
      error.code = 'AP-E212';
      throw error;
    }

    const fileName = normalizeMatchValue(resumeFile.name);
    const fileStem = normalizeMatchValue(resumeFile.name.replace(/\.[^.]+$/, ''));
    const started = Date.now();
    while (Date.now() - started < 18000) {
      const currentMarkers = attachmentMarkers(root);
      const scopeText = normalizeMatchValue(attachmentScopeText(root));
      const markerAdded = currentMarkers.some((marker) => !beforeMarkers.includes(marker));
      const nameVisible = (fileName && scopeText.includes(fileName)) || (fileStem.length >= 5 && scopeText.includes(fileStem));
      const uploadError = /upload failed|could not upload|file type not supported|file is too large|attachment failed/i.test(attachmentScopeText(root));
      if (uploadError) {
        const error = new Error('LinkedIn reported that the résumé upload failed or was unsupported.');
        error.code = 'AP-E213';
        throw error;
      }
      const pending = attachmentUploadPending(root);
      if ((nameVisible || markerAdded || attachmentLooksComplete(root, resumeFile.name)) && !pending && Date.now() - started > 220) return;
      await sleep(120);
    }
    const error = new Error(`LinkedIn received ${resumeFile.name}, but no completed attachment chip or filename confirmation appeared within 18 seconds.`);
    error.code = 'AP-E213';
    throw error;
  }

  function findAutopilotAttachButton(root) {
    const scopes = root === document
      ? [document]
      : [root, ...(findVisibleComposerRoots().length <= 1 ? [document] : [])];
    const seen = new Set();
    for (const scope of scopes) {
      for (const candidate of scope.querySelectorAll('button, [role="button"], label')) {
        if (seen.has(candidate) || !isVisible(candidate)) continue;
        seen.add(candidate);
        const label = clean(`${candidate.getAttribute('aria-label') || ''} ${candidate.getAttribute('title') || ''} ${candidate.innerText || ''}`);
        if (/attach(?: a)? file|add(?: a)? file|attach document|paperclip|upload document|add attachment/i.test(label) && !/image|photo|gif/i.test(label)) return candidate;
      }
    }
    return null;
  }

  function findAutopilotFileInput(root, beforeInputs = new Set()) {
    const usable = (candidate) => !candidate.disabled && candidate.getAttribute('aria-disabled') !== 'true';
    const localInputs = [...root.querySelectorAll('input[type="file"]')].filter(usable);
    if (localInputs.length) {
      return localInputs.sort((left, right) => autopilotFileInputScore(right, root, beforeInputs) - autopilotFileInputScore(left, root, beforeInputs))[0] || null;
    }

    if (root === document) return null;
    const globalInputs = [...document.querySelectorAll('input[type="file"]')].filter(usable);
    const newlyCreated = globalInputs.filter((candidate) => !beforeInputs.has(candidate));
    if (newlyCreated.length) {
      return newlyCreated.sort((left, right) => autopilotFileInputScore(right, root, beforeInputs) - autopilotFileInputScore(left, root, beforeInputs))[0] || null;
    }

    // Never inject a résumé into an arbitrary global file input while several
    // LinkedIn message bubbles are open. That could attach it to the wrong DM.
    if (findVisibleComposerRoots().length > 1) return null;
    return globalInputs.sort((left, right) => autopilotFileInputScore(right, root, beforeInputs) - autopilotFileInputScore(left, root, beforeInputs))[0] || null;
  }

  function autopilotFileInputScore(input, root, beforeInputs = new Set()) {
    const accept = String(input.accept || '').toLowerCase();
    const meta = normalizeMatchValue(`${input.name || ''} ${input.id || ''} ${input.getAttribute('aria-label') || ''} ${input.getAttribute('data-test-id') || ''}`);
    let score = root !== document && root.contains(input) ? 70 : 0;
    if (!beforeInputs.has(input)) score += 120;
    if (/pdf|doc|document|octet-stream|msword|officedocument/.test(accept)) score += 80;
    if (!accept || accept === '*/*') score += 25;
    if (/attachment|document|file|upload/.test(meta)) score += 35;
    if (/image|photo|avatar/.test(`${accept} ${meta}`)) score -= 120;
    return score;
  }

  function attachmentMarkers(root) {
    const scopes = root === document ? [document] : [root];
    const selectors = [
      '.msg-form__attachment',
      '.msg-form__attachment-row',
      '.msg-form__attachment-upload-progress',
      '[data-control-name*="attachment"]',
      '[data-view-name*="attachment"]',
      '[aria-label*="attachment" i]',
      '[aria-label*="remove file" i]',
      '[aria-label*="remove attachment" i]'
    ];
    const markers = [];
    for (const scope of scopes) {
      for (const selector of selectors) {
        for (const element of scope.querySelectorAll(selector)) {
          const value = `${selector}|${clean(element.innerText || element.textContent || '')}|${clean(element.getAttribute?.('aria-label') || '')}`;
          if (!markers.includes(value)) markers.push(value);
        }
      }
    }
    return markers;
  }

  function attachmentScopeText(root) {
    const local = clean(root === document ? '' : root.innerText || root.textContent || '');
    if (local) return local;
    return clean(document.body?.innerText || '');
  }

  function attachmentLooksComplete(root, fileName) {
    const stem = normalizeMatchValue(String(fileName || '').replace(/\.[^.]+$/, ''));
    const candidates = [...root.querySelectorAll('button, span, div, li')].filter((element) => {
      const label = normalizeMatchValue(`${element.innerText || element.textContent || ''} ${element.getAttribute?.('aria-label') || ''}`);
      return (stem.length >= 5 && label.includes(stem)) || /remove attachment|attachment uploaded|file attached/.test(label);
    });
    return candidates.some((element) => isVisible(element));
  }

  function attachmentUploadPending(root) {
    const selectors = [
      '[aria-busy="true"]',
      '.msg-form__attachment-upload-progress',
      '[role="progressbar"]',
      '[aria-label*="uploading" i]'
    ];
    return selectors.some((selector) => [...root.querySelectorAll(selector)].some(isVisible));
  }

  async function persistAutopilotDraft(root, composer, message) {
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(new Event('change', { bubbles: true }));
    try { composer.blur(); } catch (_) {}
    const started = Date.now();
    while (Date.now() - started < 2600) {
      if (!composer.isConnected) {
        const replacement = findComposerInRoot(root);
        if (replacement && composerContainsText(replacement, message)) return;
      } else if (composerContainsText(composer, message)) {
        const sending = [...root.querySelectorAll('[aria-busy="true"], .msg-form__attachment-upload-progress')].some(isVisible);
        if (!sending && Date.now() - started > 950) return;
      }
      await sleep(90);
    }
    const error = new Error('LinkedIn did not keep the generated message in the active composer long enough to confirm draft persistence.');
    error.code = 'AP-E214';
    throw error;
  }

  function minimiseAutopilotComposer(root) {
    const button = [...root.querySelectorAll('button, [role="button"]')].find((candidate) => {
      const label = clean(`${candidate.getAttribute('aria-label') || ''} ${candidate.getAttribute('title') || ''} ${candidate.getAttribute('data-control-name') || ''}`);
      return /minimi[sz]e(?: conversation| messaging| message)?/i.test(label);
    });
    if (!button) return false;
    try {
      button.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  function handleRuntimeMessage(message, _sender, sendResponse) {
    if (message?.type === 'ICEBREAKER_PANEL_ACTIVE') {
      panelActive = message.active === true;
      clearTimeout(hoverTimer);
      hoverTimer = null;
      currentTarget = null;
      lastSignature = '';
      lastConversationDispatchAt = 0;
      lastConversationDispatchSignature = '';
      lastConversationTarget = null;
      conversationCaptureToken += 1;
      if (badge) {
        clearTimeout(badge.hideTimer);
        badge.classList.remove('is-visible');
        badge.remove();
        badge = null;
      }
      if (!panelActive && autopilotController && ['starting', 'running', 'paused'].includes(autopilotController.status)) {
        autopilotController.stopped = true;
        autopilotController.paused = false;
        autopilotController.status = 'stopped-by-user';
        autopilotController.current.action = 'Stopped because the IceBreaker side panel was closed';
      }
      sendResponse?.({ ok: true, active: panelActive });
      return false;
    }

    if (message?.type === 'ICEBREAKER_PING' || message?.type === 'ICEBREAKER_PING_V2') {
      sendResponse({ ok: true, version: CONTENT_SCRIPT_VERSION });
      return false;
    }

    if (message?.type === 'COPY_TEXT_TO_CLIPBOARD') {
      copyText(message.text)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message || 'Could not copy the text.' }));
      return true;
    }

    if (message?.type === 'INSERT_TEXT_IN_COMPOSER') {
      try {
        const target = insertTextIntoLinkedInComposer(message.text, message.mode || generationMode);
        sendResponse({ ok: true, target });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || 'Could not insert the text.' });
      }
      return false;
    }

    if (message?.type === 'CAPTURE_SAVED_PROFILE_CONTEXT') {
      Promise.resolve(captureSavedLinkedInProfile())
        .then((context) => {
          if (!context?.text) {
            sendResponse({ ok: false, error: 'LinkedIn profile text was not available. Make sure the profile is open and you are signed in.' });
            return;
          }
          sendResponse({ ok: true, profile: context, context });
        })
        .catch((error) => sendResponse({ ok: false, error: error?.message || 'Could not save LinkedIn profile context.' }));
      return true;
    }

    if (message?.type === 'CAPTURE_CONVERSATION_CONTEXT_V2') {
      Promise.resolve().then(() => captureConversationContextNow({ allowPreview: true }))
        .then((context) => sendResponse({ ok: true, profile: context, context, diagnosticCode: context?.diagnosticCode || '' }))
        .catch((error) => sendResponse({
          ok: false,
          code: error?.code || 'E-RPL-09',
          errorCode: error?.code || 'E-RPL-09',
          error: error?.message || conversationDiagnosticMessage('E-RPL-09')
        }));
      return true;
    }

    if (
      message?.type === 'CAPTURE_CURRENT_CONTEXT' ||
      message?.type === 'CAPTURE_CURRENT_PROFILE'
    ) {
      Promise.resolve(captureCurrentContext())
        .then((context) => {
          if (!context?.name && !context?.description) {
            sendResponse({ ok: false, error: captureInstruction() });
            return;
          }
          sendResponse({ ok: true, profile: context, context });
        })
        .catch((error) => sendResponse({ ok: false, error: error?.message || captureInstruction() }));
      return true;
    }

    if (
      message?.type === 'GET_ACTIVE_CONTEXT' ||
      message?.type === 'GET_ACTIVE_CONTEXT_V2' ||
      message?.type === 'GET_HOVERED_PROFILE'
    ) {
      Promise.resolve(captureForShortcut())
        .then((context) => {
          if (!context?.name && !context?.description) {
            sendResponse({ ok: false, error: captureInstruction() });
            return;
          }
          sendResponse({ ok: true, profile: context, context });
        })
        .catch((error) => sendResponse({ ok: false, error: error?.message || captureInstruction() }));
      return true;
    }

    if (message?.type === 'SHOW_ICEBREAKER_BADGE') {
      const target = currentTarget?.container || document.querySelector('main') || document.body;
      showBadge(target, message.text || 'IceBreaker');
      sendResponse?.({ ok: true });
      return false;
    }

    if (message?.type === 'AUTOPILOT_FILL_DIRECT_COMPOSER') {
      Promise.resolve(fillAutopilotDirectComposeTab(message.payload || {}))
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) => sendResponse({ ok: false, code: error?.code || 'AP-E218', error: error?.message || 'Could not prepare the LinkedIn draft.' }));
      return true;
    }

    if (message?.type === 'GET_AUTOPILOT_START_POINT') {
      let pointerTarget = lastPointerElement?.isConnected ? lastPointerElement : null;
      if (Date.now() - Number(lastPointerPosition.at || 0) < 5000) {
        try {
          pointerTarget = document.elementFromPoint(lastPointerPosition.x, lastPointerPosition.y) || pointerTarget;
        } catch (_) {}
      }
      const hovered = pointerTarget?.isConnected ? resolveProfileTarget(pointerTarget) : null;
      const recentCached = lastAutopilotStartPoint?.container?.isConnected && Date.now() - Number(lastAutopilotStartPoint.capturedAt || 0) < 5000
        ? lastAutopilotStartPoint
        : null;
      const resolved = hovered || recentCached;
      const active = resolved?.link && resolved?.container
        ? extractProfileFromCard(resolved.link, resolved.container)
        : null;
      const profileId = active ? autopilotProfileId(active) : '';
      const profileName = active?.name || '';
      if (!profileId) {
        sendResponse({ ok: false, error: 'Keep the mouse over a LinkedIn connection card while pressing Alt+S.' });
        return false;
      }
      sendResponse({ ok: true, profileId, profileName });
      return false;
    }

    if (message?.type === 'AUTOPILOT_START') {
      if (autopilotController && ['running', 'paused', 'starting'].includes(autopilotController.status)) {
        sendResponse({ ok: false, error: 'Autopilot is already running in this LinkedIn tab.' });
        return false;
      }
      autopilotController = createAutopilotController(message.runId, message.settings, message.resumeFile, message.previousDraftProfileIds, message.previousCheckedProfileIds, message.startProfileId, message.startProfileName);
      if (
        message.startProfileId &&
        lastAutopilotStartPoint?.container?.isConnected &&
        String(lastAutopilotStartPoint.profileId || '').trim().toLowerCase() === String(message.startProfileId || '').trim().toLowerCase()
      ) {
        autopilotController.startCard = lastAutopilotStartPoint.container;
      }
      sendResponse({ ok: true });
      void runAutopilot(autopilotController);
      return false;
    }

    if (message?.type === 'AUTOPILOT_PAUSE') {
      if (autopilotController && (!message.runId || message.runId === autopilotController.runId)) {
        autopilotController.paused = true;
        autopilotController.status = 'paused';
        autopilotController.current.action = 'Paused';
        void publishAutopilotState(autopilotController);
      }
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === 'AUTOPILOT_RESUME') {
      if (autopilotController && (!message.runId || message.runId === autopilotController.runId)) {
        autopilotController.paused = false;
        autopilotController.status = 'running';
        autopilotController.current.action = 'Resuming automatic scan';
        autopilotController.lastError = '';
        autopilotController.lastErrorCode = '';
        void publishAutopilotState(autopilotController);
      }
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === 'AUTOPILOT_STOP') {
      if (autopilotController && (!message.runId || message.runId === autopilotController.runId)) {
        autopilotController.stopped = true;
        autopilotController.paused = false;
        autopilotController.status = 'stopped-by-user';
        autopilotController.current.action = 'Stopped by user';
        void flushAutopilotProfileMemory(autopilotController);
        void chrome.runtime.sendMessage({ type: 'CANCEL_GENERATION', reason: 'autopilot-stop' }).catch(() => {});
        void publishAutopilotState(autopilotController, { finishedAt: new Date().toISOString() });
      }
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === 'ICEBREAKER_SETTINGS_UPDATED') {
      lastSignature = '';
      currentTarget = null;
      lastConversationDispatchAt = 0;
      lastConversationDispatchSignature = '';
      lastConversationDiagnosticCode = '';
      lastConversationDiagnosticAt = 0;
      conversationCaptureToken += 1;
      clearTimeout(hoverTimer);
        refreshPublicSettings().finally(() => sendResponse?.({ ok: true }));
      return true;
    }

    return false;
  }

  function captureInstruction() {
    if (generationMode === 'comments') return 'Hover over a LinkedIn post, then try again.';
    if (generationMode === 'conversation') return 'Open LinkedIn Messaging and hover over a conversation row or the visible message thread.';
    return 'Hover over a LinkedIn profile card, then try again.';
  }

  function insertTextIntoLinkedInComposer(text, requestedMode) {
    const value = String(text || '').trim();
    if (!value) throw new Error('There is no generated text to insert.');

    const mode = normalizeMode(requestedMode || generationMode);
    const roots = [];
    if (currentTarget?.container && document.contains(currentTarget.container)) roots.push(currentTarget.container);
    roots.push(document);

    const selectors = mode === 'comments'
      ? [
          '.comments-comment-box-comment__text-editor [contenteditable="true"]',
          '.comments-comment-texteditor [contenteditable="true"]',
          '[data-placeholder*="comment" i][contenteditable="true"]',
          '[aria-label*="comment" i][contenteditable="true"]'
        ]
      : [
          '.msg-form [contenteditable="true"][role="textbox"]',
          '.msg-form [contenteditable="true"]',
          '.msg-overlay-conversation-bubble [contenteditable="true"][role="textbox"]',
          '[aria-label*="write a message" i][contenteditable="true"]',
          '[aria-label*="message" i][contenteditable="true"]',
          'textarea[placeholder*="message" i]'
        ];

    let composer = null;
    for (const root of roots) {
      for (const selector of selectors) {
        composer = Array.from(root.querySelectorAll(selector)).find(isVisible);
        if (composer) break;
      }
      if (composer) break;
    }

    if (!composer) {
      throw new Error(mode === 'comments'
        ? 'Open the LinkedIn comment box first, then paste the copied comment.'
        : 'Open the LinkedIn message composer first, then paste the copied text.');
    }

    composer.focus();
    const existingText = clean(composer.value || composer.innerText || composer.textContent || '');
    const insertValue = existingText ? `\n${value}` : value;
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      const start = Number.isFinite(composer.selectionStart) ? composer.selectionStart : composer.value.length;
      const end = Number.isFinite(composer.selectionEnd) ? composer.selectionEnd : start;
      composer.setRangeText(insertValue, start, end, 'end');
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(composer);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      if (!document.execCommand('insertText', false, insertValue)) composer.textContent = `${composer.textContent || ''}${insertValue}`;
      selection.removeAllRanges();
    }

    try {
      composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: insertValue }));
    } catch (_) {
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    }
    composer.dispatchEvent(new Event('change', { bubbles: true }));
    return mode === 'comments' ? 'comment' : 'message';
  }

  async function copyText(text) {
    const value = String(text || '').trim();
    if (!value) throw new Error('There is no generated text to copy.');
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (_) {}

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Chrome blocked clipboard access. Open IceBreaker and use Copy.');
  }

  function firstText(root, selectors) {
    if (!root?.querySelector) return '';
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      const text = clean(element?.innerText || element?.textContent || '');
      if (text) return text;
    }
    return '';
  }

  function inferHeadline(rawText, name) {
    const lines = rawText.split(/\n+/).map(clean).filter(Boolean);
    const normalizedName = clean(name).toLowerCase();
    return lines.find((line) => {
      const lower = line.toLowerCase();
      return lower !== normalizedName &&
        !/^view .*profile$/i.test(line) &&
        !/^(connect|follow|message|pending)$/i.test(line) &&
        line.length >= 8 && line.length <= 240;
    }) || '';
  }

  function inferDescription(rawText, name, headline, locationText) {
    const ignored = new Set([name, headline, locationText].map((value) => clean(value).toLowerCase()));
    return rawText
      .split(/\n+/)
      .map(clean)
      .filter((line) => line.length > 25 && !ignored.has(line.toLowerCase()))
      .slice(0, 4)
      .join(' ');
  }

  function inferCompany(headline) {
    const text = clean(headline);
    const atMatch = text.match(/\bat\s+([^|•·]+)$/i);
    if (atMatch) return clean(atMatch[1]);
    const pipeParts = text.split(/[|•·]/).map(clean).filter(Boolean);
    return pipeParts.length > 1 ? pipeParts[pipeParts.length - 1] : '';
  }

  function normalizeName(value) {
    return clean(value)
      .replace(/\b(1st|2nd|3rd)\b/gi, '')
      .replace(/\s*[•·]\s*.*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeLinkedInUrl(value) {
    try {
      const url = new URL(value, location.origin);
      url.search = '';
      url.hash = '';
      return url.href.replace(/\/$/, '');
    } catch (_) {
      return '';
    }
  }

  function contextSignature(context) {
    return [
      context?.mode,
      context?.url,
      context?.name,
      context?.headline,
      context?.contextType,
      String(context?.description || '').slice(-1200),
      String(context?.commentText || '').slice(-1200),
      String(context?.parentPostText || '').slice(-1200)
    ].map((value) => String(value || '').trim()).join('|');
  }

  function clean(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim();
  }

  function showBadge(_container, _text) {
    // Hover feedback now stays inside the side panel. Cursor-following popups
    // were intentionally removed because repeated Generating/Ready badges
    // obscured LinkedIn and became distracting during normal navigation.
  }
})();
