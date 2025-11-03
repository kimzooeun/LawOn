export const TokenManager = (() => {
	const ACCESS_KEY = "accessToken";

	// in-memory copy (우선순위)
	let inMemoryAccess = null;
	
	const getAccessToken = () => {
		if (inMemoryAccess) return inMemoryAccess;
		// fallback: sessionStorage/localStorage (앱 시작 직후 복구용)
		return localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY)
	};
		

	const setTokens = (accessToken, rememberMe) => {
		inMemoryAccess = accessToken;
		if(rememberMe){
			localStorage.setItem(ACCESS_KEY, accessToken);
		} else{
			sessionStorage.setItem(ACCESS_KEY, accessToken);
		}
	};
	
	const updateAccessToken = (newToken) => {
		inMemoryAccess = newToken;
		if (localStorage.getItem(ACCESS_KEY)) localStorage.setItem(ACCESS_KEY, newToken);
		else sessionStorage.setItem(ACCESS_KEY, newToken);
	};
	


	const clearTokens = () => {
		inMemoryAccess = null;
		localStorage.removeItem(ACCESS_KEY);
	  sessionStorage.removeItem(ACCESS_KEY);
	};
	
	return {getAccessToken, setTokens, updateAccessToken, clearTokens};
}) ();
