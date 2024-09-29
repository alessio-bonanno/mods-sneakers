const endpoints = {
    login: "/api/v1/login",
    signup: "/api/v1/signup",
    sessionInfo: "/api/v1/session"
};



function pathRedirect(redirectEndpoint)
{
    const params = new URLSearchParams(location.search);
    const paramsRedirectEndpoint = params.get("to");

    location.href = redirectEndpoint || paramsRedirectEndpoint || "/";
}

function saveSession(sessionId, redirectEndpoint)
{
    localStorage.setItem("auth", JSON.stringify({ sessionId }));
    pathRedirect(redirectEndpoint);
}

async function getIsUserAuthenticated()
{
    const auth = localStorage.getItem("auth");
    if(!auth || !auth.sessionId) return;

    const body = JSON.stringify({ sessionId: auth.sessionId });
    const res = await fetch(endpoints.sessionInfo, { method: "post", body, headers: { "Content-Type": "application/json" } });

    return res.status >= 200 && res.status < 300;
}