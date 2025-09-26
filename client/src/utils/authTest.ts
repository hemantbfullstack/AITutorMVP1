// Simple authentication test utility
export const testAuthFlow = () => {
  // Test 1: Check if AuthContext is available
  const authContext = document.querySelector('[data-testid="auth-context"]');
  
  // Test 2: Check if user is loaded
  const user = localStorage.getItem('auth_token');
  
  // Test 3: Check API endpoints
  const testEndpoints = async () => {
    try {
      // Test CORS
      const corsResponse = await fetch('/api/cors-test');
      const corsData = await corsResponse.json();
      // Test health (if available)
      try {
        const healthResponse = await fetch('/api/health');
        const healthData = await healthResponse.json();
      } catch (e) {
      }
      
    } catch (error) {
      console.error('❌ API test failed:', error);
    }
  };
  
  testEndpoints();
  
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testAuthFlow = testAuthFlow;
}
