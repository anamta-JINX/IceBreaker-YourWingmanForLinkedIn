# Conversation Mode diagnostics

IceBreaker v1.4.84 reports a precise `E-RPL-xx` code when Conversation Mode cannot complete a capture. The side-panel status shows the code; hover badges show the same code near the affected LinkedIn conversation.

| Code | Meaning | Recommended action |
|---|---|---|
| `E-RPL-01` | LinkedIn Messaging is not open or no supported messaging surface is visible. | Open LinkedIn Messaging or an overlay chat, then hover the conversation again. |
| `E-RPL-02` | No active inbox row or readable thread was found. | Select a conversation and keep the row or open thread visible. |
| `E-RPL-03` | A thread was found, but no readable message text was available. | Wait for the messages to load, then hover a message bubble or the composer. |
| `E-RPL-04` | The visible thread does not match the conversation IceBreaker was asked to read. | Click the intended inbox row once and retry after the correct thread opens. |
| `E-RPL-05` | The newest message sender could not be resolved reliably. | Keep sender labels and the latest messages visible, then retry. |
| `E-RPL-06` | Capture was cancelled because the page, mode, or selected thread changed. | Keep the same conversation open until the reply appears. |
| `E-RPL-07` | The content script is stale or missing from the LinkedIn tab. | Reload IceBreaker in `chrome://extensions`, then refresh the LinkedIn tab once. |
| `E-RPL-08` | LinkedIn did not finish opening the selected thread before timeout. | Open the conversation manually, wait for messages, then hover inside the thread. |
| `E-RPL-09` | The captured conversation could not be delivered to the generator. | Check the selected provider/model and retry. The conversation capture itself succeeded. |
| `E-RPL-10` | Only the inbox preview was available. | Open the full thread for a reply based on more context. IceBreaker may still use the preview as a fallback. |
| `E-RPL-11` | The pointer is outside a supported conversation row, thread, or composer. | Hover directly over the intended inbox row, message bubble, or reply box. |
| `E-RPL-12` | The candidate thread also contained feed/comment content. | Keep the pointer inside the actual messaging panel; IceBreaker rejects mixed feed containers. |
| `E-RPL-13` | A stale capture was superseded by a newer valid hover. | Keep the pointer inside the intended conversation until the reply begins generating. |
| `E-RPL-14` | A row and newly opened thread identify different people. | Hover the intended row again after LinkedIn finishes opening it. |
| `E-RPL-15` | Multiple visible threads were ambiguous. | Hover inside the exact message bubble or composer. IceBreaker will not guess. |
| `E-RPL-16` | No readable local conversation shell was available. | Wait for the chat to finish loading, then hover anywhere inside its header, messages, attachment area, or reply box. IceBreaker still refuses unrelated feed content. |

## Capture behavior

Conversation Mode reads up to the latest eight visible messages, keeps identical text when it belongs to separate message events, removes UI noise such as timestamps and delivery labels, and labels transcript lines as `[YOU]` or `[CONTACT]`. A single logical conversation produces one generation request while the pointer remains inside the same chat. Conversation Mode never reads feed cards, comments, or unrelated overlays. On the dedicated LinkedIn Messaging route, it may use the single validated messaging `main` container when LinkedIn removes the older thread wrapper classes.
