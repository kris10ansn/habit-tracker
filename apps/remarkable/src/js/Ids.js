// A habit id is minted once and never changes. Ids are random (not a sequence)
// so two offline clients never collide before the future backend merges them.
function newId() {
    const time = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return `${time}${rand}`;
}
