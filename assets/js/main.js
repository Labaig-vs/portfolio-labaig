/**
 * LABAIG PORTFOLIO - Lightbox Gallery System
 * Galería con navegación por flechas en cursor dinámico
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
      this.touchStartX = 0;
      this.touchEndX = 0;
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
      // Crear HTML del lightbox (SIN botones de navegación)
      const lightboxHTML = `
        <div class="lightbox" id="lightbox">
          <div class="lightbox-content" id="lightbox-content">
            <img src="" alt="" class="lightbox-image" id="lightbox-image" style="display: none;" />
            <video class="lightbox-video" id="lightbox-video" style="display: none;" controls></video>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', lightboxHTML);

      // Referencias a elementos
      this.lightbox = document.getElementById('lightbox');
      this.lightboxImage = document.getElementById('lightbox-image');
      this.lightboxVideo = document.getElementById('lightbox-video');
      this.lightboxContent = document.getElementById('lightbox-content');

      // Cerrar al hacer click en el fondo del lightbox
      this.lightbox.addEventListener('click', (e) => {
        // Si click directamente en el lightbox (fondo), cerrar
        if (e.target === this.lightbox) {
          this.close();
        }
      });

      // Click en la imagen/video para navegación
      this.lightboxImage.addEventListener('click', (e) => {
        this.handleImageClick(e);
      });

      this.lightboxVideo.addEventListener('click', (e) => {
        this.handleImageClick(e);
      });

      // Cambiar cursor según posición del mouse
      this.lightboxImage.addEventListener('mousemove', (e) => {
        this.updateCursor(e, this.lightboxImage);
      });

      this.lightboxVideo.addEventListener('mousemove', (e) => {
        this.updateCursor(e, this.lightboxVideo);
      });

      // Touch events para swipe en móvil
      this.lightboxImage.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      this.lightboxImage.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });

      this.lightboxVideo.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      this.lightboxVideo.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });
    }

    updateCursor(e, element) {
      // Si solo hay una imagen, no cambiar el cursor
      if (this.images.length === 1) {
        return;
      }

      // Determinar si mouse está en mitad izquierda o derecha
      const rect = element.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const middleX = rect.width / 2;

      // Remover clases anteriores
      element.classList.remove('cursor-left', 'cursor-right');

      // Añadir clase según posición
      if (mouseX < middleX) {
        element.classList.add('cursor-left');
      } else {
        element.classList.add('cursor-right');
      }
    }

    handleImageClick(e) {
      // Si solo hay una imagen, cerrar
      if (this.images.length === 1) {
        this.close();
        return;
      }

      // Determinar si click en mitad izquierda o derecha
      const rect = e.target.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const middleX = rect.width / 2;

      if (clickX < middleX) {
        // Click en mitad izquierda
        this.prev();
      } else {
        // Click en mitad derecha
        this.next();
      }
    }

    handleSwipe() {
      const swipeThreshold = 50;
      const diff = this.touchStartX - this.touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe izquierda → siguiente
          this.next();
        } else {
          // Swipe derecha → anterior
          this.prev();
        }
      }
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
      
      // Indicar si solo hay una imagen
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
      
      this.updateIndicators();
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

      // Limpiar clases de cursor
      this.lightboxImage.classList.remove('cursor-left', 'cursor-right');
      this.lightboxVideo.classList.remove('cursor-left', 'cursor-right');

      // Limpiar indicadores
      if (this.indicators) {
        this.indicators.remove();
        this.indicators = null;
      }
    }

    loadImage(index) {
      const item = this.images[index];
      const isVideo = this.isVideoFile(item.src);

      // Limpiar clases de cursor antes de cambiar imagen
      this.lightboxImage.classList.remove('cursor-left', 'cursor-right');
      this.lightboxVideo.classList.remove('cursor-left', 'cursor-right');

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
        this.updateIndicators();
      }
    }

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.loadImage(this.currentIndex);
        this.updateIndicators();
      }
    }

    updateIndicators() {
      // Crear indicadores si no existen
      if (!this.indicators) {
        this.createIndicators();
      }

      // Actualizar estado de los indicadores
      const indicators = this.indicators.querySelectorAll('.lightbox-indicator');
      indicators.forEach((indicator, index) => {
        if (index === this.currentIndex) {
          indicator.classList.add('active');
        } else {
          indicator.classList.remove('active');
        }
      });
    }

    createIndicators() {
      // Crear contenedor de indicadores
      const indicatorsContainer = document.createElement('div');
      indicatorsContainer.className = 'lightbox-indicators';
      
      // Determinar tamaño según cantidad de imágenes
      const totalImages = this.images.length;
      if (totalImages >= 16) {
        indicatorsContainer.setAttribute('data-size', 'small');
      } else if (totalImages >= 6) {
        indicatorsContainer.setAttribute('data-size', 'medium');
      } else {
        indicatorsContainer.setAttribute('data-size', 'normal');
      }
      
      // Crear un indicador por cada imagen
      this.images.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = 'lightbox-indicator';
        indicator.setAttribute('data-index', index);
        
        // Añadir evento click para navegar directamente
        indicator.addEventListener('click', () => {
          this.currentIndex = index;
          this.loadImage(index);
          this.updateIndicators();
        });
        
        indicatorsContainer.appendChild(indicator);
      });
      
      // Insertar indicadores en el lightbox
      this.lightbox.appendChild(indicatorsContainer);
      this.indicators = indicatorsContainer;
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
        // Reproducir videos automáticamente sin necesidad de hover
        video.play().catch(e => console.log('Autoplay prevented:', e));
        
        // Opcional: pausar cuando sale de la vista
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              video.play().catch(e => console.log('Autoplay prevented:', e));
            } else {
              video.pause();
            }
          });
        });
        
        observer.observe(video.closest('.project-card'));
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
      
      // Optimizar URLs de Cloudinary
      CloudinaryOptimizer.optimizeAll();
    });
  };

  // ===================================
  // CLOUDINARY URL OPTIMIZER
  // ===================================
  
  class CloudinaryOptimizer {
    static optimizeImage(url) {
      // Optimizar URLs de imágenes con q_auto:best,f_auto para máxima calidad
      if (url.includes('cloudinary.com') && url.includes('/image/')) {
        return url.replace(
          /\/upload\//,
          '/upload/q_auto:best,f_auto/'
        );
      }
      return url;
    }
    
    static optimizeVideo(url) {
      // Optimizar URLs de videos con q_auto:best,vc_auto para máxima calidad
      if (url.includes('cloudinary.com') && url.includes('/video/')) {
        return url.replace(
          /\/upload\//,
          '/upload/q_auto:best,vc_auto/'
        );
      }
      return url;
    }
    
    static optimizeAll() {
      // Optimizar todas las imágenes y videos del documento
      const images = document.querySelectorAll('img[src*="cloudinary.com"]');
      const videos = document.querySelectorAll('video[src*="cloudinary.com"]');
      
      // Optimizar imágenes
      images.forEach(img => {
        const originalSrc = img.src;
        img.src = this.optimizeImage(originalSrc);
        
        // También optimizar srcset si existe
        if (img.srcset) {
          img.srcset = img.srcset.replace(/\/upload\//g, '/upload/q_auto,f_auto/');
        }
      });
      
      // Optimizar videos
      videos.forEach(video => {
        const originalSrc = video.src;
        video.src = this.optimizeVideo(originalSrc);
      });
      
      // Optimizar URLs en data-gallery
      const galleryElements = document.querySelectorAll('[data-gallery]');
      galleryElements.forEach(element => {
        const galleryData = JSON.parse(element.getAttribute('data-gallery'));
        const optimizedGallery = galleryData.map(item => {
          if (item.src && item.src.includes('cloudinary.com')) {
            item.src = this.optimizeImage(item.src);
          }
          return item;
        });
        element.setAttribute('data-gallery', JSON.stringify(optimizedGallery));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();