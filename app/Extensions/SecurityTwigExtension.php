<?php

declare(strict_types=1);

namespace App\Extensions;

use App\Middlewares\SecurityHeadersMiddleware;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

class SecurityTwigExtension extends AbstractExtension
{
    public function getFilters(): array
    {
        return [
            new TwigFilter('safe_html', $this->sanitizeHtml(...), ['is_safe' => ['html']]),
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('csp_nonce', $this->getCspNonce(...)),
        ];
    }

    /**
     * Get the current request's CSP nonce for use in inline scripts
     */
    public function getCspNonce(): string
    {
        return SecurityHeadersMiddleware::getNonce() ?? '';
    }

    public function sanitizeHtml(?string $html): string
    {
        if ($html === null || $html === '') {
            return '';
        }
        // Basic whitelist sanitizer without external deps
        $allowedTags = [
            'p','a','strong','em','ul','ol','li','blockquote','h2','h3','h4','hr','br','span'
        ];
        $allowedAttrs = [
            'a' => ['href','rel','target'],
            'span' => ['class'],
        ];

        $doc = new \DOMDocument('1.0', 'UTF-8');
        $doc->strictErrorChecking = false;
        $previousErrorMode = libxml_use_internal_errors(true);
        $loaded = $doc->loadHTML(
            '<?xml encoding="UTF-8"><div>'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previousErrorMode);

        $wrapper = $loaded ? $doc->documentElement : null;
        if (!$wrapper) {
            return '';
        }

        // Sanitize the wrapper's children and serialize only those children.
        // Passing the whole document to sanitizeNode() stripped plain text and
        // caused the DOM parser to discard content around its implied HTML nodes.
        foreach (iterator_to_array($wrapper->childNodes) as $child) {
            $this->sanitizeNode($child, $allowedTags, $allowedAttrs);
        }

        $out = '';
        foreach ($wrapper->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }
        return $out;
    }

    /**
     * Check if an href value uses an allowed URI protocol.
     * Uses allowlist (consistent with Sanitizer::html) instead of denylist.
     * Operates on DOM-decoded values (after HTML entity resolution).
     */
    private function isAllowedHref(string $value): bool
    {
        // Strip whitespace and control characters, then check protocol
        $normalized = preg_replace('/[\x00-\x20]+/', '', $value);
        return (bool) preg_match('~^(https?://|mailto:|tel:|/|#)~i', (string) $normalized);
    }

    private function sanitizeNode(\DOMNode $node, array $allowedTags, array $allowedAttrs): void
    {
        if ($node->nodeType === XML_ELEMENT_NODE) {
            $tag = strtolower($node->nodeName);
            if (!in_array($tag, $allowedTags, true)) {
                // Replace disallowed element with its text content
                $parent = $node->parentNode;
                if ($parent) {
                    while ($node->firstChild) {
                        $parent->insertBefore($node->firstChild, $node);
                    }
                    $parent->removeChild($node);
                    return; // children already reparented
                }
            } elseif ($node instanceof \DOMElement) {
                // Filter attributes
                if ($node->hasAttributes()) {
                    /** @var \DOMNamedNodeMap<\DOMAttr> $attrs */
                    $attrs = $node->attributes;
                    for ($i = $attrs->length - 1; $i >= 0; $i--) {
                        $attr = $attrs->item($i);
                        $name = strtolower($attr->nodeName);
                        $allowed = $allowedAttrs[$tag] ?? [];
                        if (!in_array($name, $allowed, true)) {
                            $node->removeAttributeNode($attr);
                            continue;
                        }
                        // Check for dangerous protocols on DOM-decoded values
                        if ($tag === 'a' && $name === 'href' && !$this->isAllowedHref((string)$attr->nodeValue)) {
                            $node->removeAttribute('href');
                            continue;
                        }
                        if ($tag === 'a' && $name === 'target') {
                            // Normalize target
                            $node->setAttribute('rel', 'noopener noreferrer');
                        }
                    }
                }
            }
        }
        $children = iterator_to_array($node->childNodes);
        foreach ($children as $child) {
            $this->sanitizeNode($child, $allowedTags, $allowedAttrs);
        }
    }
}
