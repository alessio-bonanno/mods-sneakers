const authEndpoints = new Endpoints({
    session: "/session/{sessionId}",
    sessionInfo: "/session/{sessionId}/info",
    signup: "/signup",
    login: "/login",
    logout: "/logout",
    forgotPassword: "/forgot-password"
}, "/user/auth");



function getAuthenticationError(errorCode)
{
    switch(errorCode)
    {
        case 10: return "Username già esistente";
        case 11: return "Email già esistente";
        case 12: return "Username non trovato";
        case 13: return "Password errata";
        case 14: return "Non esiste utente con l'email inserita";
        case 15: return "Sessione non valida";
        case 16: return "Sessione scaduta";
        default: return "Errore sconosciuto";
    }
}


function pathRedirect(redirectEndpoint, target)
{
    const params = new URLSearchParams(location.search);
    const paramsRedirectEndpoint = params.get("to");
    const endpoint = redirectEndpoint || paramsRedirectEndpoint || "/";

    if(target) window.open(endpoint, target);
    else location.href = endpoint;
}

function saveSession(sessionId, redirectEndpoint)
{
    localStorage.setItem("auth", JSON.stringify({ sessionId })); // cookie? cosa sono? si mangiano?
    pathRedirect(redirectEndpoint);
}

function getLocalSessionId()
{
    const authString = localStorage.getItem("auth");
    if(!authString) return null;

    const auth = JSON.parse(authString);

    return auth.sessionId || null;
}

async function getIsUserAuthenticated()
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return false;

    const res = await authEndpoints.fetch(authEndpoints.session, { path: { sessionId } });
    return res.status >= 200 && res.status < 300 || !!saveSession(null);
}

async function getUserInfo()
{
    const sessionId = getLocalSessionId();
    if(!sessionId) return null;

    const res = await authEndpoints.fetch(authEndpoints.sessionInfo, { path: { sessionId } });
    if(res.status < 200 || res.status >= 300) return null;

    return await res.json();
}