// Simple authentication test utility
export const testAuthFlow = () => {
  console.log('🧪 Testing Authentication Flow...');
  
  // Test 1: Check if AuthContext is available
  const authContext = document.querySelector('[data-testid="auth-context"]');
  console.log('✅ AuthContext available:', !!authContext);
  
  // Test 2: Check if user is loaded
  const user = localStorage.getItem('auth_token');
  console.log('✅ User token exists:', !!user);
  
  // Test 3: Check API endpoints
  const testEndpoints = async () => {
    try {
      // Test CORS
      const corsResponse = await fetch('/api/cors-test');
      const corsData = await corsResponse.json();
      console.log('✅ CORS test:', corsData.message);
      
      // Test health (if available)
      try {
        const healthResponse = await fetch('/api/health');
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData.status);
      } catch (e) {
        console.log('⚠️ Health endpoint not available');
      }
      
    } catch (error) {
      console.error('❌ API test failed:', error);
    }
  };
  
  testEndpoints();
  
  console.log('🎉 Authentication flow test completed!');
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testAuthFlow = testAuthFlow;
}
