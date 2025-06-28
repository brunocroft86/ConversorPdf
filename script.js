// Configuração inicial
const { jsPDF } = window.jspdf;
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const convertBtn = document.getElementById('convertBtn');
const downloadLink = document.getElementById('downloadLink');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

let files = [];

// Eventos de arrastar e soltar
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const newFiles = dt.files;
    handleFiles(newFiles);
}

fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

function handleFiles(newFiles) {
    files = [...files, ...Array.from(newFiles)];
    updateFilePreview();
    convertBtn.disabled = files.length === 0;
}

function updateFilePreview() {
    filePreview.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        let iconClass = 'fa-file-alt';
        if (file.type.startsWith('image/')) {
            iconClass = 'fa-file-image';
        } else if (file.type.includes('pdf')) {
            iconClass = 'fa-file-pdf';
        } else if (file.type.includes('word') || file.type.includes('document')) {
            iconClass = 'fa-file-word';
        } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
            iconClass = 'fa-file-excel';
        } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
            iconClass = 'fa-file-powerpoint';
        }
        
        fileItem.innerHTML = `
            <i class="fas ${iconClass} file-icon"></i>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <i class="fas fa-times remove-file" data-index="${index}"></i>
        `;
        
        filePreview.appendChild(fileItem);
    });
    
    // Adiciona eventos para remover arquivos
    document.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            files.splice(index, 1);
            updateFilePreview();
            convertBtn.disabled = files.length === 0;
        });
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Conversão para PDF
convertBtn.addEventListener('click', async function() {
    if (files.length === 0) return;
    
    try {
        convertBtn.disabled = true;
        progressContainer.style.display = 'block';
        downloadLink.style.display = 'none';
        
        const pdfName = document.getElementById('pdfName').value || 'documento';
        const pageSize = document.getElementById('pageSize').value;
        const orientation = document.getElementById('pageOrientation').value;
        const margin = parseInt(document.getElementById('marginSize').value);
        
        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: pageSize
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const usableWidth = pageWidth - (margin * 2);
        const usableHeight = pageHeight - (margin * 2);
        
        let currentY = margin;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Atualiza progresso
            const progress = Math.round((i / files.length) * 100);
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            
            if (file.type.startsWith('image/')) {
                await addImageToPDF(doc, file, margin, currentY, usableWidth, usableHeight);
                currentY = doc.internal.pageSize.getHeight() - margin;
            } else {
                // Para outros tipos de arquivo, podemos adicionar o nome do arquivo como texto
                doc.text(`Arquivo: ${file.name}`, margin, currentY);
                currentY += 10;
            }
            
            // Adiciona nova página se não for o último arquivo
            if (i < files.length - 1) {
                doc.addPage(pageSize, orientation);
                currentY = margin;
            }
        }
        
        // Atualiza progresso para 100%
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        
        // Cria link de download
        const pdfOutput = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfOutput);
        downloadLink.href = pdfUrl;
        downloadLink.download = `${pdfName}.pdf`;
        downloadLink.style.display = 'block';
        
        convertBtn.disabled = false;
    } catch (error) {
        console.error('Erro ao converter para PDF:', error);
        alert('Ocorreu um erro ao converter para PDF. Por favor, tente novamente.');
        convertBtn.disabled = false;
        progressContainer.style.display = 'none';
    }
});

async function addImageToPDF(doc, imageFile, x, y, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Calcula dimensões mantendo proporção
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width *= ratio;
                    height *= ratio;
                }
                
                if (height > maxHeight) {
                    const ratio = maxHeight / height;
                    width *= ratio;
                    height *= ratio;
                }
                
                // Adiciona imagem ao PDF
                doc.addImage(img, 'JPEG', x, y, width, height);
                resolve();
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
    });
}