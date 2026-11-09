const localSpin = spin;
const localBuyFeature = buyFeature;
let sharedDebitLock = false;
let pendingSharedDebit = null;
const baseWalletUI = ui;
ui = function () {
  baseWalletUI();
  if (sharedDebitLock) {
    const ids = ['#spin', '#buyFeature', '#auto', '#hudBetDown', '#hudBetUp'];
    ids.forEach(id => { const button = $(id); if (button) button.disabled = true; });
  }
};
async function sharedDebit(amount, reason) {
  if (!pendingSharedDebit || pendingSharedDebit.amount !== amount || pendingSharedDebit.reason !== reason) pendingSharedDebit = { requestId: crypto.randomUUID(), amount, reason };
  const response = await fetch('/api/auth/game/debit', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingSharedDebit) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || '扣款失敗，請確認帳戶餘額後再試。');
  pendingSharedDebit = null;
  return Number(result.balance);
}
spin = async function (automatic = false) {
  if (sharedDebitLock) return;
  if (!walletReady || spinning || gameMode !== 'base') return localSpin(automatic);
  const actualStake = bet * (ante ? 1.25 : 1);
  if (balance < actualStake) return localSpin(automatic);
  sharedDebitLock = true; ui();
  try { balance = await sharedDebit(Math.round(actualStake), 'spin') + actualStake; await localSpin(automatic); }
  catch (error) { status(error.message); }
  finally { sharedDebitLock = false; ui(); }
};
buyFeature = async function () {
  if (sharedDebitLock || !walletReady || spinning || gameMode !== 'base') return;
  const cost = bet * BUY;
  if (balance < cost) return localBuyFeature();
  sharedDebitLock = true; ui();
  try { balance = await sharedDebit(cost, 'feature') + cost; await localBuyFeature(); }
  catch (error) { status(error.message); }
  finally { sharedDebitLock = false; ui(); }
};
