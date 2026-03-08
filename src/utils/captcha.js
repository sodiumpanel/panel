export const loadTurnstile = () => {
    return new Promise((resolve) => {
        if (window.turnstile) return resolve(window.turnstile);

        const script = document.createElement('script');
        script.src = "https://challenges.cloudflare.com";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.turnstile);
        document.head.appendChild(script);
    });
};
