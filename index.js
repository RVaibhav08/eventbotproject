const express = require('express');
const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TBC = 'To be confirmed — please check tantrafiesta.in for official updates.';
const ORG = 'tantrafiesta@iiitn.ac.in / contact@tantrafiesta.in';
const WEBSITE = 'https://tantrafiesta.in';

// Event facts are based on the supplied starter package. Unconfirmed facts remain unconfirmed.
const EVENTS = {
  Algorithmia: { title: 'Algorithmia — ICPC Style Coding Challenge', club: 'DotSlash', category: 'coding', description: 'A competitive programming challenge.', venue: 'Computer Labs / Academic Block' },
  FlashCode: { title: 'FlashCode', club: 'DotSlash', category: 'coding', description: 'A coding event by DotSlash.', venue: 'Computer Labs / Academic Block' },
  Ragnarok: { title: 'Ragnarok — Agentic Hackathon', club: 'CRISPR', category: 'hackathon', description: 'An agentic hackathon by CRISPR.', venue: 'Seminar Hall / Academic Block' },
  Cascade26: { title: "Cascade'26 — Flagship Hackathon", club: 'CRISPR', category: 'hackathon', description: 'The flagship hackathon listed in the starter data.', venue: TBC },
  RannBhoomi: { title: 'Rann Bhoomi 2.0 — Robowars', club: 'IoTics', category: 'robotics', description: 'A robotics battle event.', venue: 'Parking Area / Amphitheatre' },
  LostPathways: { title: 'The Lost Pathways (Micromouse)', club: 'IoTics', category: 'robotics', description: 'A micromouse robotics challenge.', venue: 'Academic Block / CR 204' },
  LineOMania: { title: 'Line-O-Mania', club: 'IoTics', category: 'robotics', description: 'A line-following robotics event.', venue: TBC },
  VLSIWorkshop: { title: 'VLSI Workshop', club: 'IoTics', category: 'workshop', description: 'A workshop listed by IoTics.', venue: 'Academic Block' },
  KeepAlive26: { title: "Keep Alive '26 — Incident Response Championship", club: 'GDGoC', category: 'devops', description: 'An incident response championship.', venue: 'Academic Block / Seminar Hall' },
  DesignAThon: { title: 'Design-A-Thon', club: 'Strokes', category: 'design', description: 'A design-focused event.', venue: 'CR-305 / CR-306 / CR-203 / Reading Room' },
  BrandXperience: { title: 'Brand-Xperience', club: 'Strokes', category: 'design', description: 'A branding and visual experience event.', venue: 'CR-305 / CR-306 / CR-203 / Reading Room' }
};
const CLUBS = {
  DotSlash: { about: 'Competitive programming and coding club', events: ['Algorithmia', 'FlashCode'], contact: ORG, venue: 'Computer Labs / Academic Block' },
  CRISPR: { about: 'Technical, research and AI/ML club', events: ['Ragnarok', 'Cascade26'], contact: 'tantrafiesta@iiitn.ac.in', venue: 'Seminar Hall / Academic Block' },
  Elevate: { about: 'Software development club', events: ['Cascade26'], contact: ORG, venue: TBC },
  IoTics: { about: 'Robotics, IoT, embedded systems and VLSI club', events: ['RannBhoomi', 'LostPathways', 'LineOMania', 'VLSIWorkshop'], contact: 'iotics@iiitn.ac.in', venue: 'Parking Area / Amphitheatre; Academic Block / CR 204' },
  GDGoC: { about: 'Cloud, DevOps and SRE developer group', events: ['KeepAlive26'], contact: 'gdg@iiitn.ac.in', venue: 'Academic Block / Seminar Hall' },
  Strokes: { about: 'Graphic design, UI/UX and visual arts club', events: ['DesignAThon', 'BrandXperience'], contact: 'strokes@iiitn.ac.in', venue: 'CR-305 / CR-306 / CR-203 / Reading Room' }
};
const aliases = { 'cascade 26':'Cascade26', "cascade'26":'Cascade26', 'robowars':'RannBhoomi', 'rann bhoomi':'RannBhoomi', 'micromouse':'LostPathways', 'line-o-mania':'LineOMania', 'line follower':'LineOMania', 'keep alive':'KeepAlive26', 'design-a-thon':'DesignAThon', 'brand-xperience':'BrandXperience', 'vlsi workshop':'VLSIWorkshop', 'gdg':'GDGoC' };
function normalize(value, obj) {
  if (!value) return null;
  const raw = String(value).trim();
  if (obj[raw]) return raw;
  const lower = raw.toLowerCase();
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lower) return k;
  if (aliases[lower] && obj[aliases[lower]]) return aliases[lower];
  for (const [k, v] of Object.entries(obj)) if (v.title && v.title.toLowerCase().includes(lower)) return k;
  return null;
}
function eventKeyFromText(text) {
  const t = String(text || '').toLowerCase();
  for (const [key, e] of Object.entries(EVENTS)) {
    const variants = [key, e.title, e.title.split(' — ')[0]];
    if (variants.some(v => t.includes(v.toLowerCase()))) return key;
  }
  for (const [alias, key] of Object.entries(aliases)) if (t.includes(alias)) return key;
  return null;
}
function makeText(text) { return { platform: 'PLATFORM_UNSPECIFIED', text: { text: [text] } }; }
function makeQuickReplies(title, replies) { return { platform: 'PLATFORM_UNSPECIFIED', quickReplies: { title, quickReplies: replies } }; }
function makeCard(title, subtitle, buttons = []) {
  return { platform: 'PLATFORM_UNSPECIFIED', card: { title, subtitle, buttons: buttons.map(b => ({ text: b.text, postback: b.url || b.value || WEBSITE })) } };
}
function response(res, text, messages = []) {
  const fulfillmentMessages = [makeText(text), ...messages];
  res.json({ fulfillmentText: text, fulfillmentMessages, source: 'eventmate-rich-webhook' });
}
function eventCard(key) {
  const e = EVENTS[key];
  return makeCard(e.title, `${e.description}\nOrganizer: ${e.club}\nCategory: ${e.category}\nDate/time, fee and rules: ${TBC}`, [
    { text: 'Registration', url: WEBSITE }, { text: 'Contact', url: `mailto:${CLUBS[e.club]?.contact || ORG}` }
  ]);
}
function eventList(category = '') {
  const items = Object.entries(EVENTS).filter(([, e]) => !category || e.category === category.toLowerCase());
  return items.map(([k, e]) => ({ key: k, ...e }));
}
function answerForDialogflow(body) {
  const q = body.queryResult || {};
  const name = q.intent?.displayName || '';
  const p = q.parameters || {};
  const query = q.queryText || '';
  const ek = normalize(p.event, EVENTS) || eventKeyFromText(query);
  const ck = normalize(p.club, CLUBS) || normalize((query.match(/dotslash|crispr|elevate|iotics|g[ds]goc|strokes/i) || [])[0], CLUBS);
  let text = '';
  let rich = [];
  if (name === 'Default Welcome Intent' || /^(hi|hello|hey|start)$/i.test(query.trim())) {
    text = "Hi! 👋 I'm EventMate, your Tantra Fiesta '26 guide at IIIT Nagpur. What would you like to explore?";
    rich = [makeQuickReplies('Choose a section', ['Explore events', 'Find a club', 'Registration help', 'Contact support'])];
  } else if (name === 'Event.List' || /list.*events|show.*events|what events|explore events/i.test(query)) {
    const cat = p.category || (/robot|micromouse/i.test(query) ? 'robotics' : /design/i.test(query) ? 'design' : /coding|programming/i.test(query) ? 'coding' : /hackathon/i.test(query) ? 'hackathon' : '');
    const list = eventList(cat);
    text = (list.length ? list.map(e => `• ${e.title} — ${e.club}`).join('\n') : 'I could not find events in that category.') + `\n\nOfficial dates, fees and rules: ${TBC}`;
    rich = [makeQuickReplies('Filter by category', ['Coding', 'Hackathons', 'Robotics', 'Design', 'DevOps', 'Workshops']), ...list.slice(0, 3).map(e => eventCard(e.key))];
  } else if (name.startsWith('Event.') || ek) {
    if (!ek) {
      text = 'Which event do you mean? Try Algorithmia, FlashCode, Ragnarok, Cascade’26, Rann Bhoomi, Lost Pathways, Line-O-Mania, VLSI Workshop, Keep Alive, Design-A-Thon, or Brand-Xperience.';
      rich = [makeQuickReplies('Popular events', ['Algorithmia', 'Ragnarok', "Cascade'26", 'Rann Bhoomi 2.0', 'Design-A-Thon'])];
    } else {
      const e = EVENTS[ek];
      text = `${e.title}\n${e.description}\nOrganizer: ${e.club}\nCategory: ${e.category}\nVenue: ${e.venue}\nDate/time, fee, eligibility and rules: ${TBC}`;
      rich = [eventCard(ek), makeQuickReplies('What next?', ['Registration', 'More event details', 'Find a club', 'Main menu'])];
    }
  } else if (name.startsWith('Club.') || ck) {
    if (!ck) {
      text = 'Which club are you interested in? DotSlash, CRISPR, Elevate, IoTics, GDGoC, or Strokes.';
      rich = [makeQuickReplies('Choose a club', Object.keys(CLUBS))];
    } else {
      const c = CLUBS[ck];
      const events = c.events.map(k => EVENTS[k].title).join('\n• ');
      text = `${ck}\n${c.about}\nEvents:\n• ${events}\nClub location: ${c.venue}\nContact: ${c.contact}`;
      rich = [makeCard(ck, `${c.about}\nEvents: ${c.events.map(k => EVENTS[k].title).join(', ')}\nLocation: ${c.venue}`, [{ text: 'Contact club', url: `mailto:${c.contact.split(' / ')[0]}` }, { text: 'Festival website', url: WEBSITE }]), makeQuickReplies('Explore another section', ['All events', 'Find a club', 'Registration help'])];
    }
  } else if (name === 'Finder.Start') {
    const cat = String(p.category || '').toLowerCase();
    const list = eventList(cat);
    text = list.length ? list.map(e => `• ${e.title} — ${e.club}`).join('\n') : 'Choose a category: coding, hackathons, robotics, design, DevOps, or workshops.';
    rich = [makeQuickReplies('Choose a category', ['Coding', 'Hackathons', 'Robotics', 'Design', 'DevOps', 'Workshops'])];
  } else if (name.startsWith('Register.') || /register|registration/i.test(query)) {
    text = ek ? `To register for ${EVENTS[ek].title}, visit ${WEBSITE}. Registration deadline and fee: ${TBC}` : `Open ${WEBSITE} for festival registration information. Tell me the event name and I can show its details. ${TBC}`;
    rich = [makeCard('Registration', 'Use the official festival website. Do not rely on unconfirmed fees or deadlines.', [{ text: 'Open festival website', url: WEBSITE }]), makeQuickReplies('Choose an event', Object.keys(EVENTS).slice(0, 5))];
  } else if (name === 'Venue.Directions' || /directions|where is|venue/i.test(query)) {
    text = `Venue details can vary by event. Check the event card or ask the on-site help desk. ${TBC}`;
    rich = [makeQuickReplies('Find venue for', ['Algorithmia', 'Ragnarok', 'Rann Bhoomi 2.0', 'Design-A-Thon'])];
  } else if (name === 'Support.Start' || /contact|support|help/i.test(query)) {
    text = `For support, email ${ORG} with the event name and relevant details.`;
    rich = [makeCard('EventMate Support', 'Include the event name and a short description of your question.', [{ text: 'Email support', url: 'mailto:tantrafiesta@iiitn.ac.in' }, { text: 'Festival website', url: WEBSITE }])];
  } else if (name === 'Goodbye') {
    text = 'Thanks for chatting with EventMate! Good luck at Tantra Fiesta ’26. 🎉';
    rich = [makeQuickReplies('Before you go', ['Explore events', 'Find a club', 'Contact support'])];
  } else {
    text = `I can help with events, clubs, registration, venues, and support. Try “List all events” or “Tell me about Ragnarok”.`;
    rich = [makeQuickReplies('Try one of these', ['List all events', 'Find a club', 'Registration help', 'Contact support'])];
  }
  return { text, rich };
}
app.get('/', (_req, res) => res.send('EventMate rich webhook is running'));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'eventmate-webhook' }));
app.post('/webhook', (req, res) => {
  try {
    const answer = answerForDialogflow(req.body || {});
    response(res, answer.text, answer.rich);
  } catch (err) {
    console.error('Dialogflow webhook error:', err);
    response(res, 'Sorry, something went wrong. Please try again or contact tantrafiesta@iiitn.ac.in.');
  }
});

// Telegram helpers: Telegram token is read only from Render's environment variables.
async function telegram(method, payload) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN environment variable is not configured');
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!data.ok) throw new Error(data.description || 'Telegram API request failed');
  return data.result;
}
function tgMenu() {
  return { inline_keyboard: [
    [{ text: '📅 Explore events', callback_data: 'menu:events' }, { text: '🏫 Find a club', callback_data: 'menu:clubs' }],
    [{ text: '📝 Registration', callback_data: 'menu:register' }, { text: '📍 Venue help', callback_data: 'menu:venue' }],
    [{ text: '✉️ Contact support', callback_data: 'menu:support' }, { text: '🌐 Official website', url: WEBSITE }]
  ] };
}
function tgEventKeyboard(key) {
  return { inline_keyboard: [
    [{ text: '📝 Registration / website', url: WEBSITE }],
    [{ text: '⬅️ All events', callback_data: 'menu:events' }, { text: '🏠 Main menu', callback_data: 'menu:home' }]
  ] };
}
async function tgSend(chatId, text, reply_markup) {
  return telegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(reply_markup ? { reply_markup } : {}) });
}
async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    const cb = update.callback_query;
    await telegram('answerCallbackQuery', { callback_query_id: cb.id });
    const chatId = cb.message?.chat?.id;
    if (!chatId) return;
    const action = cb.data || '';
    if (action === 'menu:home') return tgSend(chatId, '<b>EventMate 🎉</b>\nYour Tantra Fiesta ’26 guide. What would you like to do?', tgMenu());
    if (action === 'menu:events') {
      const rows = Object.entries(EVENTS).map(([k,e]) => [{ text: e.title, callback_data: `event:${k}` }]);
      rows.push([{ text: '🏠 Main menu', callback_data: 'menu:home' }]);
      return tgSend(chatId, '<b>📅 Events</b>\nChoose an event to see its details. Dates, fees and rules are confirmed only by the official organizers.', { inline_keyboard: rows });
    }
    if (action === 'menu:clubs') {
      return tgSend(chatId, '<b>🏫 Clubs</b>\nChoose a club:', { inline_keyboard: [...Object.keys(CLUBS).map(k => [{ text: k, callback_data: `club:${k}` }]), [{ text: '🏠 Main menu', callback_data: 'menu:home' }]] });
    }
    if (action === 'menu:register') return tgSend(chatId, `📝 <b>Registration</b>\nUse the official website: ${WEBSITE}\nFees and deadlines: ${TBC}`, { inline_keyboard: [[{ text: 'Open registration website', url: WEBSITE }], [{ text: '📅 Browse events', callback_data: 'menu:events' }, { text: '🏠 Main menu', callback_data: 'menu:home' }]] });
    if (action === 'menu:venue') return tgSend(chatId, `📍 Venue details depend on the event. Choose an event from the event menu or ask the on-site help desk.\n${TBC}`, { inline_keyboard: [[{ text: '📅 Browse events', callback_data: 'menu:events' }, { text: '🏠 Main menu', callback_data: 'menu:home' }]] });
    if (action === 'menu:support') return tgSend(chatId, `✉️ <b>Support</b>\nEmail: ${ORG}`, { inline_keyboard: [[{ text: 'Official website', url: WEBSITE }], [{ text: '🏠 Main menu', callback_data: 'menu:home' }]] });
    if (action.startsWith('event:')) {
      const key = action.slice(6); const e = EVENTS[key]; if (!e) return tgSend(chatId, 'I could not find that event. Please choose from the event menu.', tgMenu());
      return tgSend(chatId, `<b>${escapeHtml(e.title)}</b>\n\n${escapeHtml(e.description)}\n\n<b>Organizer:</b> ${escapeHtml(e.club)}\n<b>Category:</b> ${escapeHtml(e.category)}\n<b>Venue:</b> ${escapeHtml(e.venue)}\n<b>Date/time, fees and rules:</b> ${escapeHtml(TBC)}`, tgEventKeyboard(key));
    }
    if (action.startsWith('club:')) {
      const key = action.slice(5); const c = CLUBS[key]; if (!c) return tgSend(chatId, 'I could not find that club.', tgMenu());
      const evs = c.events.map(k => EVENTS[k].title).join('\n• ');
      return tgSend(chatId, `<b>🏫 ${escapeHtml(key)}</b>\n${escapeHtml(c.about)}\n\n<b>Events</b>\n• ${escapeHtml(evs)}\n\n<b>Contact:</b> ${escapeHtml(c.contact)}\n<b>Location:</b> ${escapeHtml(c.venue)}`, { inline_keyboard: [[{ text: '🌐 Festival website', url: WEBSITE }, { text: '📅 Browse events', callback_data: 'menu:events' }], [{ text: '🏠 Main menu', callback_data: 'menu:home' }]] });
    }
    return tgSend(chatId, 'Choose an option from the menu.', tgMenu());
  }
  const msg = update.message;
  if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;
  const text = String(msg.text || '').trim();
  if (!text || /^\/start(?:@\w+)?/i.test(text) || /^(hi|hello|hey|menu)$/i.test(text)) {
    return tgSend(chatId, '<b>Hi! 👋 I’m EventMate</b>\nYour Tantra Fiesta ’26 guide at IIIT Nagpur. Choose what you need:', tgMenu());
  }
  if (/^\/help/i.test(text)) return tgSend(chatId, 'I can help you browse events, learn about clubs, find registration information and contact support.', tgMenu());
  const key = eventKeyFromText(text);
  if (/event|list|show me|all events/i.test(text)) {
    const rows = Object.entries(EVENTS).map(([k,e]) => [{ text: e.title, callback_data: `event:${k}` }]);
    rows.push([{ text: '🏠 Main menu', callback_data: 'menu:home' }]);
    return tgSend(chatId, '<b>📅 Tantra Fiesta events</b>\nTap an event for details:', { inline_keyboard: rows });
  }
  if (/club/i.test(text)) return tgSend(chatId, '<b>🏫 Choose a club</b>', { inline_keyboard: [...Object.keys(CLUBS).map(k => [{ text: k, callback_data: `club:${k}` }]), [{ text: '🏠 Main menu', callback_data: 'menu:home' }]] });
  if (/register/i.test(text)) return tgSend(chatId, `📝 Registration: ${WEBSITE}\n${TBC}`, { inline_keyboard: [[{ text: 'Open official website', url: WEBSITE }], [{ text: '📅 Browse events', callback_data: 'menu:events' }]] });
  if (key) {
    const e = EVENTS[key];
    return tgSend(chatId, `<b>${escapeHtml(e.title)}</b>\n\n${escapeHtml(e.description)}\n<b>Organizer:</b> ${escapeHtml(e.club)}\n<b>Category:</b> ${escapeHtml(e.category)}\n<b>Venue:</b> ${escapeHtml(e.venue)}\n<b>Dates, fees and rules:</b> ${escapeHtml(TBC)}`, tgEventKeyboard(key));
  }
  return tgSend(chatId, 'I can help with events, clubs, registration, venue guidance and support. Choose an option:', tgMenu());
}
function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
app.post('/telegram/webhook', async (req, res) => {
  // Acknowledge Telegram quickly; process the update asynchronously.
  res.sendStatus(200);
  try { await handleTelegramUpdate(req.body || {}); }
  catch (err) { console.error('Telegram webhook error:', err.message); }
});
app.listen(PORT, () => console.log(`EventMate rich webhook ready on port ${PORT}`));
