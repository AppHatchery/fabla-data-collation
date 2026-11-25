/**
 * Voice Entry Module
 * Shared rules for voice diary rows (textaudio / audio questions):
 * whether an entry was recorded as audio or typed as text, when the
 * participant submitted it, and whether a typed entry looks low-effort.
 */

// Typed answers that carry no diary content, compared after lowercasing and stripping punctuation
const LOW_EFFORT_PLACEHOLDERS = new Set([
    'na', 'n a', 'none', 'nothing', 'no', 'nope', 'nah', 'nada', 'nil', 'null',
    'idk', 'i dont know', 'dont know', 'ok', 'okay', 'k', 'fine', 'good', 'same',
    'test', 'testing', 'skip', 'pass', 'x', 'xx', 'xxx', 'asdf', 'meh',
    'no comment', 'nothing new', 'nothing to report', 'nothing to say', 'not applicable'
]);
const LOW_EFFORT_MIN_CHARACTERS = 3;
const LOW_EFFORT_MIN_WORDS = 3;

class VoiceEntry {
    static isBlank(value) {
        if (value === null || value === undefined) return true;
        const s = String(value).trim().toLowerCase();
        return s === '' || s === 'none' || s === 'null' || s === 'undefined';
    }

    static isVoiceDiaryRow(row) {
        const questionType = String(row.QuestionsType || '').trim().toLowerCase();
        return questionType === 'textaudio' || questionType === 'audio';
    }

    static hasReference(row) {
        return !VoiceEntry.isBlank(row.Reference);
    }

    // 'audio' when the row points at a recording, 'text' when it was typed
    static entryType(row) {
        return VoiceEntry.hasReference(row) ? 'audio' : 'text';
    }

    // Participant-side submission time (RespondedAt), not the server receipt time in Date
    static submittedAt(row) {
        if (VoiceEntry.isBlank(row.RespondedAt)) return '';
        const raw = String(row.RespondedAt).trim();
        const m = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2}(?::\d{2})?)/);
        return m ? `${m[1]} ${m[2]}` : raw;
    }

    // Reason a typed response looks low-effort, or null when it looks like a real entry
    static lowEffortReason(response) {
        if (VoiceEntry.isBlank(response)) return 'Empty response';

        const normalized = String(response)
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (LOW_EFFORT_PLACEHOLDERS.has(normalized)) return 'Placeholder answer';

        const characters = normalized.replace(/\s/g, '');
        if (characters.length < LOW_EFFORT_MIN_CHARACTERS) return 'Too short';
        if (/^(.)\1+$/u.test(characters)) return 'Repeated characters';

        const words = normalized.split(' ').filter(Boolean).length;
        if (words < LOW_EFFORT_MIN_WORDS) return `Only ${words} word${words === 1 ? '' : 's'}`;

        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceEntry;
}
