import { describe, it, expect } from 'vitest';
import { linkify, isLinkPart, highlightChordsAndCode, renderUrlAsLink } from './music-utils';
import React from 'react';

describe('linkify', () => {
  it('should parse URLs in text', () => {
    const text = 'Check out https://example.com for more info';
    const result = linkify(text);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: 'text', text: 'Check out ' });
    expect(result[1]).toEqual({ type: 'link', href: 'https://example.com', text: 'https://example.com' });
    expect(result[2]).toEqual({ type: 'text', text: ' for more info' });
  });

  it('should handle multiple URLs', () => {
    const text = 'Visit https://example.com and https://test.com';
    const result = linkify(text);
    
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ type: 'text', text: 'Visit ' });
    expect(result[1]).toEqual({ type: 'link', href: 'https://example.com', text: 'https://example.com' });
    expect(result[2]).toEqual({ type: 'text', text: ' and ' });
    expect(result[3]).toEqual({ type: 'link', href: 'https://test.com', text: 'https://test.com' });
  });

  it('should handle text without URLs', () => {
    const text = 'No links here';
    const result = linkify(text);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'text', text: 'No links here' });
  });

  it('should handle empty text', () => {
    const result = linkify('');
    expect(result).toHaveLength(0);
  });

  it('should support both http and https URLs', () => {
    const text = 'http://example.com and https://secure.com';
    const result = linkify(text);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: 'link', href: 'http://example.com', text: 'http://example.com' });
    expect(result[1]).toEqual({ type: 'text', text: ' and ' });
    expect(result[2]).toEqual({ type: 'link', href: 'https://secure.com', text: 'https://secure.com' });
  });
});

describe('isLinkPart', () => {
  it('should identify link parts', () => {
    const linkPart = { type: 'link' as const, href: 'https://example.com', text: 'https://example.com' };
    expect(isLinkPart(linkPart)).toBe(true);
  });

  it('should identify text parts', () => {
    const textPart = { type: 'text' as const, text: 'some text' };
    expect(isLinkPart(textPart)).toBe(false);
  });
});

describe('renderUrlAsLink', () => {
  it('should create a link element with correct props', () => {
    const url = 'https://example.com';
    const key = 'test-key';
    const element = renderUrlAsLink(url, key) as React.ReactElement;
    
    expect(React.isValidElement(element)).toBe(true);
    expect(element.type).toBe('a');
    expect(element.props.href).toBe(url);
    expect(element.props.target).toBe('_blank');
    expect(element.props.rel).toBe('noopener noreferrer');
    expect(element.props.className).toBe('text-primary underline hover:text-primary/80');
    expect(element.props.children).toBe(url);
    expect(element.key).toBe(key);
  });
});

describe('highlightChordsAndCode', () => {
  it('should parse URLs in content', () => {
    const text = 'Check out https://example.com for tabs';
    const result = highlightChordsAndCode(text);
    
    expect(result.length).toBeGreaterThan(0);
    
    // Find the link element
    const linkElement = result.find(el => 
      React.isValidElement(el) && el.type === 'a'
    );
    
    expect(linkElement).toBeDefined();
    if (React.isValidElement(linkElement)) {
      expect(linkElement.props.href).toBe('https://example.com');
    }
  });

  it('should handle chords and URLs together', () => {
    const text = '(C) (G) Check https://example.com (Am)';
    const result = highlightChordsAndCode(text);
    
    expect(result.length).toBeGreaterThan(0);
    
    // Should have chord elements
    const chordElements = result.filter(el => 
      React.isValidElement(el) && 
      el.type === 'span' && 
      el.props.className?.includes('font-bold')
    );
    expect(chordElements.length).toBeGreaterThan(0);
    
    // Should have link element
    const linkElement = result.find(el => 
      React.isValidElement(el) && el.type === 'a'
    );
    expect(linkElement).toBeDefined();
  });

  it('should handle code blocks and URLs', () => {
    const text = 'Visit https://example.com\n```\ncode here\n```\nMore at https://test.com';
    const result = highlightChordsAndCode(text);
    
    expect(result.length).toBeGreaterThan(0);
    
    // Should have code block
    const codeBlock = result.find(el => 
      React.isValidElement(el) && el.type === 'pre'
    );
    expect(codeBlock).toBeDefined();
    
    // Should have link elements
    const linkElements = result.filter(el => 
      React.isValidElement(el) && el.type === 'a'
    );
    expect(linkElements.length).toBe(2);
  });

  it('should handle text without URLs or chords', () => {
    const text = 'Just plain text';
    const result = highlightChordsAndCode(text);
    
    expect(result).toContain('Just plain text');
  });

  it('should handle empty text', () => {
    const result = highlightChordsAndCode('');
    expect(result).toHaveLength(0);
  });

  it('should transpose chords while preserving URLs', () => {
    const text = '(C) Visit https://example.com (G)';
    const result = highlightChordsAndCode(text, 2);
    
    // Should have transposed chords
    const chordElements = result.filter(el => 
      React.isValidElement(el) && 
      el.type === 'span' && 
      el.props.className?.includes('font-bold')
    );
    
    expect(chordElements.length).toBe(2);
    if (React.isValidElement(chordElements[0])) {
      expect(chordElements[0].props.children).toBe('(D)'); // C + 2 = D
    }
    if (React.isValidElement(chordElements[1])) {
      expect(chordElements[1].props.children).toBe('(A)'); // G + 2 = A
    }
    
    // Should still have URL
    const linkElement = result.find(el => 
      React.isValidElement(el) && el.type === 'a'
    );
    expect(linkElement).toBeDefined();
  });

  it('should handle multiple URLs in content', () => {
    const text = 'First https://example.com then https://test.com and https://another.com';
    const result = highlightChordsAndCode(text);
    
    const linkElements = result.filter(el => 
      React.isValidElement(el) && el.type === 'a'
    );
    
    expect(linkElements.length).toBe(3);
  });
});
