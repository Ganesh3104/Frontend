// Minimal toast helper using Bootstrap alerts inserted into DOM.
// Replace with a full toast library (react-toastify) for production.
export default function useToast() {
  function show(message, type = 'info', timeout = 3500) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    el.style.zIndex = 9999;
    el.innerText = message;
    document.body.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade');
      try { el.remove(); } catch (e) {}
    }, timeout);
  }
  return { show };
}
