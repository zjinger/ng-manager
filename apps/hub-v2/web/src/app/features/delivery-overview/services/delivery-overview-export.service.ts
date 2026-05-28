import { Injectable } from '@angular/core';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

@Injectable({ providedIn: 'root' })
export class DeliveryOverviewExportService {
  async exportPng(element: HTMLElement, filename: string): Promise<void> {
    const dataUrl = await this.renderPng(element);
    this.download(dataUrl, filename.endsWith('.png') ? filename : `${filename}.png`);
  }

  async exportPdf(element: HTMLElement, filename: string): Promise<void> {
    const dataUrl = await this.renderPng(element);
    const image = await this.loadImage(dataUrl);
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const imageHeight = (image.height * contentWidth) / image.width;
    let renderedHeight = 0;

    while (renderedHeight < imageHeight) {
      if (renderedHeight > 0) {
        pdf.addPage();
      }
      pdf.addImage(dataUrl, 'PNG', margin, margin - renderedHeight, contentWidth, imageHeight);
      renderedHeight += pageHeight - margin * 2;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }

  private async renderPng(element: HTMLElement): Promise<string> {
    const { container, exportElement } = this.createExportElement(element);
    await this.nextFrame();
    try {
      return await toPng(exportElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: this.resolveBackgroundColor(exportElement),
        filter: (node) => !(node instanceof HTMLElement && node.hasAttribute('data-export-hidden')),
      });
    } finally {
      container.remove();
    }
  }

  private createExportElement(element: HTMLElement): { container: HTMLElement; exportElement: HTMLElement } {
    const container = document.createElement('div');
    const clone = element.cloneNode(true) as HTMLElement;
    clone.classList.add('delivery-page--exporting');
    container.style.position = 'fixed';
    container.style.left = '-2000px';
    container.style.top = '0';
    container.style.width = '1440px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2147483647';
    container.appendChild(clone);
    document.body.appendChild(container);
    return { container, exportElement: clone };
  }

  private resolveBackgroundColor(element: HTMLElement): string {
    const style = getComputedStyle(element);
    return style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ? style.backgroundColor
      : '#f5f7fb';
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('导出图片渲染失败'));
      image.src = dataUrl;
    });
  }

  private download(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }
}
