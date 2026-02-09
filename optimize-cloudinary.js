const fs = require('fs');
const path = require('path');

class CloudinaryHTMLOptimizer {
  constructor() {
    this.stats = {
      imagesUpdated: 0,
      videosUpdated: 0,
      examples: [],
      skippedUrls: [],
      brokenUrls: [],
      templateUrls: []
    };
  }

  optimizeImage(url) {
    if (!url.includes('cloudinary.com') || !url.includes('/image/')) {
      return url;
    }
    
    // Forzamos q_auto:best para mantener la máxima calidad
    if (url.includes('q_auto:best') && url.includes('f_auto')) {
      return url;
    }
    
    // Buscar /upload/ y reemplazar sin importar lo que haya en medio
    return url.replace(/\/upload\//, '/upload/q_auto:best,f_auto/');
  }

  optimizeVideo(url) {
    if (!url.includes('cloudinary.com') || !url.includes('/video/')) {
      return url;
    }
    
    // Si ya tiene q_auto:best,vc_auto no duplicar
    if (url.includes('q_auto:best') && url.includes('vc_auto')) {
      return url;
    }
    
    // Usamos q_80 para asegurar nitidez en video y vc_auto para códec automático
    return url.replace(/\/upload\//, '/upload/q_80,vc_auto/');
  }

  generateImageSrcset(baseUrl) {
    const optimizedBase = this.optimizeImage(baseUrl);
    const sizes = [480, 768, 1024, 1440, 1920, 2560];
    
    return sizes.map(width => {
      // Extraer el ID y extensión de la URL
      const urlParts = optimizedBase.match(/(.+\/upload\/q_auto,f_auto\/)(.+)$/);
      if (!urlParts) return '';
      
      const [, prefix, filename] = urlParts;
      return `${prefix}w_${width}/${filename} ${width}w`;
    }).filter(url => url).join(', ');
  }

  generateVideoSources(baseUrl) {
    const optimizedBase = this.optimizeVideo(baseUrl);
    const sizes = [480, 768, 1024, 1440, 1920];
    
    return sizes.map(width => {
      const urlParts = optimizedBase.match(/(.+\/upload\/q_auto,vc_auto\/)(.+)$/);
      if (!urlParts) return '';
      
      const [, prefix, filename] = urlParts;
      return `${prefix}w_${width}/${filename}`;
    }).filter(url => url);
  }

  processHTMLContent(content) {
    let modifiedContent = content;
    
    // Procesar imágenes <img>
    const imgRegex = /<img([^>]*?)src\s*=\s*["']([^"']*cloudinary\.com[^"']*?)["']([^>]*?)>/gi;
    modifiedContent = modifiedContent.replace(imgRegex, (match, beforeSrc, src, afterSrc) => {
      const originalSrc = src;
      const optimizedSrc = this.optimizeImage(src);
      
      // Guardar ejemplo
      if (this.stats.examples.length < 5 && originalSrc !== optimizedSrc) {
        this.stats.examples.push({ original: originalSrc, optimized: optimizedSrc });
      }
      
      if (originalSrc !== optimizedSrc) {
        this.stats.imagesUpdated++;
      }
      
      // Generar srcset si no existe
      const hasSrcset = afterSrc.includes('srcset=');
      let newAfterSrc = afterSrc;
      
      if (!hasSrcset && originalSrc !== optimizedSrc) {
        const srcset = this.generateImageSrcset(originalSrc);
        if (srcset) {
          // Determinar sizes según el contexto
          let sizes = '100vw';
          if (beforeSrc.includes('project-card-image')) {
            sizes = '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw';
          } else if (beforeSrc.includes('column-image')) {
            sizes = '33vw';
          }
          
          newAfterSrc = ` srcset="${srcset}" sizes="${sizes}"${afterSrc}`;
        }
      }
      
      return `<img${beforeSrc}src="${optimizedSrc}"${newAfterSrc}>`;
    });
    
    // Procesar videos <video>
    const videoRegex = /<video([^>]*?)src\s*=\s*["']([^"']*cloudinary\.com[^"']*?)["']([^>]*?)>/gi;
    modifiedContent = modifiedContent.replace(videoRegex, (match, beforeSrc, src, afterSrc) => {
      const originalSrc = src;
      const optimizedSrc = this.optimizeVideo(src);
      
      if (originalSrc !== optimizedSrc) {
        this.stats.videosUpdated++;
        if (this.stats.examples.length < 5) {
          this.stats.examples.push({ original: originalSrc, optimized: optimizedSrc });
        }
      }
      
      // Generar poster si no existe
      if (!afterSrc.includes('poster=')) {
        // Extraer el nombre del archivo para generar poster
        const videoName = originalSrc.split('/').pop().split('.')[0];
        const posterUrl = originalSrc.replace(/\/upload\/q_80,vc_auto\/(.+)$/, '/upload/q_auto:best,f_auto/$1');
        afterSrc += ` poster="${posterUrl}"`;
      }
      
      return `<video${beforeSrc}src="${optimizedSrc}"${afterSrc}>`;
    });
    
    // Procesar data-gallery JSON
    const galleryRegex = /data-gallery\s*=\s*["']([^"']*cloudinary\.com[^"']*?)["']/gi;
    modifiedContent = modifiedContent.replace(galleryRegex, (match, jsonStr) => {
      try {
        const galleryData = JSON.parse(jsonStr);
        const optimizedGallery = galleryData.map(item => {
          if (item.src && item.src.includes('cloudinary.com')) {
            const originalSrc = item.src;
            item.src = this.optimizeImage(originalSrc);
            
            if (originalSrc !== item.src && this.stats.examples.length < 5) {
              this.stats.examples.push({ original: originalSrc, optimized: item.src });
            }
          }
          return item;
        });
        return `data-gallery='${JSON.stringify(optimizedGallery).replace(/"/g, "'")}'`;
      } catch (e) {
        console.log('Error parsing gallery data:', e);
        return match;
      }
    });
    
    return modifiedContent;
  }

  processFile(filePath) {
    try {
      // Crear backup
      const backupPath = filePath + '.bak';
      fs.copyFileSync(filePath, backupPath);
      
      // Leer y procesar contenido
      const content = fs.readFileSync(filePath, 'utf8');
      const modifiedContent = this.processHTMLContent(content);
      
      // Guardar cambios
      fs.writeFileSync(filePath, modifiedContent);
      
      return {
        original: filePath,
        backup: backupPath,
        modified: true
      };
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      return {
        original: filePath,
        backup: null,
        modified: false,
        error: error.message
      };
    }
  }

  generateReport(processedFiles) {
    let report = '=== CLOUDINARY OPTIMIZATION REPORT ===\n\n';
    
    report += 'FILES PROCESSED:\n';
    processedFiles.forEach(file => {
      report += `- Original: ${file.original}\n`;
      report += `- Backup: ${file.backup}\n`;
      report += `- Modified: ${file.modified}\n`;
      if (file.error) {
        report += `- Error: ${file.error}\n`;
      }
      report += '\n';
    });
    
    report += '\nSTATISTICS:\n';
    report += `- Images updated: ${this.stats.imagesUpdated}\n`;
    report += `- Videos updated: ${this.stats.videosUpdated}\n`;
    report += `- URLs skipped: ${this.stats.skippedUrls.length}\n`;
    report += `- Broken URLs: ${this.stats.brokenUrls.length}\n`;
    report += `- Template URLs: ${this.stats.templateUrls.length}\n\n`;
    
    report += 'EXAMPLES (Original → Optimized):\n';
    this.stats.examples.forEach((example, index) => {
      report += `${index + 1}. ${example.original}\n   → ${example.optimized}\n\n`;
    });
    
    if (this.stats.skippedUrls.length > 0) {
      report += 'SKIPPED URLS:\n';
      this.stats.skippedUrls.forEach(url => {
        report += `- ${url}\n`;
      });
      report += '\n';
    }
    
    return report;
  }
}

// Función principal para ejecutar la optimización
function optimizeAllHTMLFiles(directory) {
  const optimizer = new CloudinaryHTMLOptimizer();
  const processedFiles = [];
  
  function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (file.endsWith('.html')) {
        console.log(`Processing: ${filePath}`);
        const result = optimizer.processFile(filePath);
        processedFiles.push(result);
      }
    });
  }
  
  processDirectory(directory);
  
  // Generar reporte
  const report = optimizer.generateReport(processedFiles);
  fs.writeFileSync(path.join(directory, 'optimization-report.txt'), report);
  
  console.log('Optimization completed!');
  console.log('Report saved to: optimization-report.txt');
  
  return processedFiles;
}

// Exportar para uso como módulo
module.exports = {
  CloudinaryHTMLOptimizer,
  optimizeAllHTMLFiles
};

// Si se ejecuta directamente
if (require.main === module) {
  const directory = process.argv[2] || '.';
  optimizeAllHTMLFiles(directory);
}
