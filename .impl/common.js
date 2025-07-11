// Common JavaScript functionality shared across pages

// Add interactive mouse movement for floating shapes
function initFloatingShapes() {
  document.addEventListener('mousemove', function (e) {
    const shapes = document.querySelectorAll('.floating-shape');
    if (shapes.length === 0) return;
    
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    shapes.forEach((shape, index) => {
      const speed = (index + 1) * 0.5;
      const translateX = (x - 0.5) * speed * 10;
      const translateY = (y - 0.5) * speed * 10;

      shape.style.transform = `translate(${translateX}px, ${translateY}px)`;
    });
  });
}

// Add smooth animations when page loads
function initPageAnimations() {
  // Add fade-in effect to main content
  const container = document.querySelector('.container');
  if (container) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      container.style.transition = 'all 0.6s ease-out';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 100);
  }
}

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Common scripts loaded');
  initFloatingShapes();
  initPageAnimations();
});
