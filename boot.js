const loading = document.getElementById('loading');
try {
  await import('./game.js');
  document.getElementById('startButton').disabled = false;
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 650);
} catch (error) {
  console.error('Gothic Island initialization failed', error);
  loading.querySelector('.loadline').remove();
  loading.querySelector('.tiny').textContent = 'ゲームを読み込めませんでした。通信環境と WebGL 2 を確認してください。';
  const retry = document.createElement('button');
  retry.textContent = '再読み込み';
  retry.addEventListener('click', () => location.reload());
  loading.append(retry);
}
