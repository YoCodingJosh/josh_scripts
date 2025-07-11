// 404 page specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
  console.log('404 page loaded');
  
  // Add click effect to the 404 text
  const errorCode = document.querySelector('.error-code');
  if (errorCode) {
    errorCode.addEventListener('click', function () {
      this.style.animation = 'none';
      setTimeout(() => {
        this.style.animation = 'pulse 2s ease-in-out infinite alternate';
      }, 100);
    });
  }
});
