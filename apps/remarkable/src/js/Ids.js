// A habit id is minted once and never changes. Ids are RFC-4122 v4 UUIDs so a client-minted id
// is also the backend's Guid primary key — no id mapping — and two offline clients never collide
// before the backend merges them (see ADR 0003 and the shared glossary). Math.random-based: the
// Qt 5.15 V4 engine has no crypto, and collision odds are negligible for one user's devices.
function newId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
