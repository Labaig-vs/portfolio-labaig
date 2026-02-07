/**
 * LABAIG PORTFOLIO - Lightbox Gallery System
 * Galería con navegación por flechas
 */

(function() {
  'use strict';

  // ===================================
  // LIGHTBOX GALLERY CLASS
  // ===================================

  class LightboxGallery {
    constructor() {
      this.lightbox = null;
      this.currentIndex = 0;
      this.images = [];
      this.isOpen = false;
      this.clickedElement = null;
      this.init();
    }

    init() {
      // Crear estructura del lightbox
      this.createLightbox();
      
      // Escuchar clicks en project cards con galería
      this.attachCardListeners();
      
      // Escuchar teclas de teclado
      document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    createLightbox() {
      // Crear HTML del lightbox
      const lightboxHTML = `
        <div class="lightbox" id="lightbox">
          <button class="lightbox-arrow lightbox-arrow-left" id="lightbox-prev" aria-label="Anterior"></button>
          <div class="lightbox-content" id="lightbox-content">
            <img src="" alt="" class="lightbox-image" id="lightbox-image" style="display: none;" />
            <video class="lightbox-video" id="lightbox-video" style="display: none;" controls></video>
          </div>
          <button class="lightbox-arrow lightbox-arrow-right" id="lightbox-next" aria-label="Siguiente"></button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', lightboxHTML);

      // Referencias a elementos
      this.lightbox = document.getElementById('lightbox');
      this.lightboxImage = document.getElementById('lightbox-image');
      this.lightboxVideo = document.getElementById('lightbox-video');
      this.lightboxContent = document.getElementById('lightbox-content');
      this.prevBtn = document.getElementById('lightbox-prev');
      this.nextBtn = document.getElementById('lightbox-next');

      // Event listeners
      this.prevBtn.addEventListener('click', () => this.prev());
      this.nextBtn.addEventListener('click', () => this.next());
      
      // Cerrar al hacer click en el fondo (no en la imagen/video)
      this.lightbox.addEventListener('click', (e) => {
        // Si click en la imagen/video, no cerrar
        if (e.target === this.lightboxImage || e.target === this.lightboxVideo) {
          return;
        }
        
        // Si click en las flechas, no cerrar (ya tienen sus listeners)
        if (e.target.closest('.lightbox-arrow')) {
          return;
        }
        
        // Si click en el contenedor de la imagen, no cerrar
        if (e.target === this.lightboxContent) {
          return;
        }
        
        // Si click en cualquier otro lado del lightbox → cerrar
        if (e.target === this.lightbox) {
          this.close();
        }
      });
    }

    attachCardListeners() {
      // Delegar eventos a los project cards
      document.addEventListener('click', (e) => {
        const card = e.target.closest('[data-gallery]');
        if (card) {
          e.preventDefault();
          this.clickedElement = card.querySelector('img, video');
          const galleryData = JSON.parse(card.dataset.gallery);
          this.open(galleryData, 0);
        }
      });
    }

    open(images, startIndex = 0) {
      this.images = images;
      this.currentIndex = startIndex;
      this.isOpen = true;
      
      // Indicar si solo hay una imagen (ocultar flechas)
      if (this.images.length === 1) {
        this.lightbox.setAttribute('data-single-image', 'true');
      } else {
        this.lightbox.removeAttribute('data-single-image');
      }
      
      // Mostrar lightbox con display primero
      this.lightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // Cargar primera imagen
      this.loadImage(this.currentIndex);
      
      // Forzar reflow para que la transición funcione
      this.lightbox.offsetHeight;
      
      // Activar lightbox (trigger transition)
      requestAnimationFrame(() => {
        this.lightbox.classList.add('active');
      });
      
      this.updateButtons();
    }

    close() {
      this.isOpen = false;
      this.lightbox.classList.remove('active');
      
      // Esperar a que termine la transición antes de ocultar
      setTimeout(() => {
        if (!this.isOpen) {
          this.lightbox.style.display = 'none';
          document.body.style.overflow = '';
        }
      }, 400);
      
      // Limpiar
      this.lightboxImage.style.display = 'none';
      this.lightboxVideo.style.display = 'none';
      this.lightboxVideo.pause();
      this.lightboxVideo.src = '';
      this.clickedElement = null;
    }

    loadImage(index) {
      const item = this.images[index];
      const isVideo = this.isVideoFile(item.src);

      if (isVideo) {
        // Mostrar video
        this.lightboxImage.style.display = 'none';
        this.lightboxVideo.style.display = 'block';
        this.lightboxVideo.src = item.src;
        
        // Resetear transición para nueva imagen
        this.lightboxVideo.style.opacity = '0';
        this.lightboxVideo.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
          this.lightboxVideo.style.opacity = '';
          this.lightboxVideo.style.transform = '';
        }, 50);
      } else {
        // Mostrar imagen
        this.lightboxVideo.style.display = 'none';
        this.lightboxImage.style.display = 'block';
        this.lightboxImage.src = item.src;
        this.lightboxImage.alt = item.alt || '';
        
        // Resetear transición para nueva imagen
        this.lightboxImage.style.opacity = '0';
        this.lightboxImage.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
          this.lightboxImage.style.opacity = '';
          this.lightboxImage.style.transform = '';
        }, 50);
      }
    }

    next() {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++;
        this.loadImage(this.currentIndex);
        this.updateButtons();
      }
    }

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.loadImage(this.currentIndex);
        this.updateButtons();
      }
    }

    updateButtons() {
      // Deshabilitar botón izquierdo al inicio
      if (this.currentIndex === 0) {
        this.prevBtn.disabled = true;
      } else {
        this.prevBtn.disabled = false;
      }

      // Deshabilitar botón derecho al final
      if (this.currentIndex === this.images.length - 1) {
        this.nextBtn.disabled = true;
      } else {
        this.nextBtn.disabled = false;
      }
    }

    handleKeyboard(e) {
      if (!this.isOpen) return;

      switch(e.key) {
        case 'Escape':
          this.close();
          break;
        case 'ArrowLeft':
          this.prev();
          break;
        case 'ArrowRight':
          this.next();
          break;
      }
    }

    isVideoFile(src) {
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogv'];
      return videoExtensions.some(ext => src.toLowerCase().endsWith(ext));
    }
  }

  // ===================================
  // PROJECT CARD HANDLERS
  // ===================================

  class ProjectCardHandler {
    constructor() {
      this.init();
    }

    init() {
      // Manejar clicks en project cards que llevan a páginas
      document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-project-link]');
        if (link && !link.hasAttribute('data-gallery')) {
          // Si tiene data-project-link pero NO data-gallery, 
          // es un link normal a página de proyecto
          // El navegador manejará la navegación normalmente
        }
      });

      // Autoplay videos en cards al hacer hover
      this.handleVideoCards();
    }

    handleVideoCards() {
      const videoCards = document.querySelectorAll('.project-card-video');
      
      videoCards.forEach(video => {
        const card = video.closest('.project-card');
        
        if (card) {
          card.addEventListener('mouseenter', () => {
            video.play().catch(e => console.log('Autoplay prevented:', e));
          });

          card.addEventListener('mouseleave', () => {
            video.pause();
            video.currentTime = 0;
          });
        }
      });
    }
  }

  // ===================================
  // VIDEO HANDLER (para slideshow del home)
  // ===================================

  class VideoHandler {
    constructor() {
      this.videos = document.querySelectorAll('.column-video');
      this.init();
    }

    init() {
      if (!this.videos.length) return;

      this.videos.forEach(video => {
        this.playVideo(video);
        this.observeVideo(video);
      });
    }

    playVideo(video) {
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {})
          .catch(error => {
            console.log('Autoplay prevented:', error);
          });
      }
    }

    observeVideo(video) {
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.25
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.playVideo(entry.target);
          } else {
            entry.target.pause();
          }
        });
      }, options);

      observer.observe(video);
    }
  }

  // ===================================
  // SLIDESHOW HANDLER (para home)
  // ===================================

  class SlideshowHandler {
    constructor() {
      this.columns = document.querySelectorAll('[data-slideshow]');
      this.interval = 3000;
      this.timers = new Map();
      this.init();
    }

    init() {
      if (!this.columns.length) return;

      this.columns.forEach(column => {
        const slides = column.querySelectorAll('.column-slide');
        if (slides.length <= 1) return;

        let currentIndex = 0;

        const nextSlide = () => {
          slides[currentIndex].classList.remove('active');
          currentIndex = (currentIndex + 1) % slides.length;
          slides[currentIndex].classList.add('active');
        };

        const timer = setInterval(nextSlide, this.interval);
        this.timers.set(column, timer);
      });
    }

    destroy() {
      this.timers.forEach(timer => clearInterval(timer));
      this.timers.clear();
    }
  }

  // ===================================
  // PERFORMANCE OPTIMIZER
  // ===================================

  class PerformanceOptimizer {
    constructor() {
      this.init();
    }

    init() {
      this.lazyLoadImages();
      this.prefetchPages();
    }

    lazyLoadImages() {
      const images = document.querySelectorAll('img[loading="lazy"]');
      
      if ('loading' in HTMLImageElement.prototype) {
        return;
      }

      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.removeAttribute('loading');
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }

    prefetchPages() {
      const links = document.querySelectorAll('a[href$=".html"]');
      
      links.forEach(link => {
        link.addEventListener('mouseenter', () => {
          const href = link.getAttribute('href');
          if (!document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = href;
            document.head.appendChild(prefetchLink);
          }
        }, { once: true });
      });
    }
  }

  // ===================================
  // INITIALIZATION
  // ===================================

  const init = () => {
    new LightboxGallery();
    new ProjectCardHandler();
    new VideoHandler();
    new SlideshowHandler();
    new PerformanceOptimizer();

    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('loaded');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();