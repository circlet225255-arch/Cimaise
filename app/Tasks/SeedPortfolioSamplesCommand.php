<?php

declare(strict_types=1);

namespace App\Tasks;

use App\Services\PageCacheService;
use App\Services\SettingsService;
use App\Services\UploadService;
use App\Support\Database;
use PDO;
use RuntimeException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Adds a small, clearly labelled portfolio sample set without changing or
 * deleting any existing albums. Safe to rerun: albums with these stable slugs
 * are left untouched.
 *
 *   php bin/console seed:portfolio-samples
 */
#[AsCommand(name: 'seed:portfolio-samples', description: 'Add the clearly labelled Axel theme review albums without changing existing albums')]
class SeedPortfolioSamplesCommand extends Command
{
    /** @var array<int, array{slug: string, title: string, excerpt: string, photos: array<int, array{file: string, alt: string}>}> */
    private const SAMPLES = [
        [
            'slug' => 'sample-blue-hour',
            'title' => 'Sample — Blue Hour',
            'excerpt' => 'Design sample — generated imagery for reviewing the portfolio layout. Replace or remove this set before launch.',
            'photos' => [
                ['file' => 'coast-blue-hour.jpg', 'alt' => 'Sample photograph of a quiet coastal alley at blue hour'],
            ],
        ],
        [
            'slug' => 'sample-light-studies',
            'title' => 'Sample — Light Studies',
            'excerpt' => 'Design sample — a study of warm light, shadow and small everyday details. Replace or remove this set before launch.',
            'photos' => [
                ['file' => 'wall-and-shadow.jpg', 'alt' => 'Sample photograph of afternoon light and shadow across a pale stone wall'],
                ['file' => 'peach-still-life.jpg', 'alt' => 'Sample photograph of a peach and leaves in warm window light'],
            ],
        ],
        [
            'slug' => 'sample-concrete-quiet',
            'title' => 'Sample — Concrete Quiet',
            'excerpt' => 'Design sample — an architectural study for reviewing album and gallery presentation. Replace or remove this set before launch.',
            'photos' => [
                ['file' => 'concrete-stairwell.jpg', 'alt' => 'Sample photograph of a sunlit modernist concrete stairwell'],
            ],
        ],
    ];

    public function __construct(private readonly Database $db)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $root = dirname(__DIR__, 2);
        $sourceDir = $root . '/public/assets/portfolio-samples';
        $originalDir = $root . '/storage/originals';
        $pdo = $this->db->pdo();

        $categoryStmt = $pdo->prepare('SELECT id FROM categories WHERE slug = ? LIMIT 1');
        $categoryStmt->execute(['photo']);
        $categoryId = (int) $categoryStmt->fetchColumn();
        if ($categoryId < 1) {
            $output->writeln('<error>Required “Photo” category (slug: photo) was not found.</error>');
            return Command::FAILURE;
        }

        foreach (self::SAMPLES as $sample) {
            foreach ($sample['photos'] as $photo) {
                if (!is_file($sourceDir . '/' . $photo['file'])) {
                    $output->writeln('<error>Missing sample image: ' . $sourceDir . '/' . $photo['file'] . '</error>');
                    return Command::FAILURE;
                }
            }
        }

        if (!is_dir($originalDir) && !@mkdir($originalDir, 0775, true) && !is_dir($originalDir)) {
            $output->writeln('<error>Could not create storage/originals.</error>');
            return Command::FAILURE;
        }

        $templateStmt = $pdo->prepare('SELECT id FROM templates WHERE slug = ? LIMIT 1');
        $templateStmt->execute(['grid-classica']);
        $templateId = $templateStmt->fetchColumn();
        $templateId = $templateId === false ? null : (int) $templateId;
        $upload = new UploadService($this->db);
        $added = 0;

        foreach (self::SAMPLES as $index => $sample) {
            $existing = $pdo->prepare('SELECT id FROM albums WHERE slug = ? LIMIT 1');
            $existing->execute([$sample['slug']]);
            if ($existing->fetchColumn()) {
                $output->writeln('<comment>Kept existing sample album: ' . $sample['slug'] . '</comment>');
                continue;
            }

            $pdo->beginTransaction();
            $newOriginals = [];
            $generatedPaths = [];
            try {
                $albumStmt = $pdo->prepare(
                    'INSERT INTO albums (title, slug, category_id, template_id, album_page_template, excerpt,
                                         is_published, published_at, show_date, show_equipment, sort_order,
                                         is_nsfw, allow_template_switch)
                     VALUES (:title, :slug, :category, :template, :page_template, :excerpt,
                             1, :published_at, 0, 0, :sort_order, 0, 0)'
                );
                $albumStmt->execute([
                    ':title' => $sample['title'],
                    ':slug' => $sample['slug'],
                    ':category' => $categoryId,
                    ':template' => $templateId,
                    ':page_template' => 'axel',
                    ':excerpt' => $sample['excerpt'],
                    ':published_at' => date('Y-m-d H:i:s'),
                    ':sort_order' => $index,
                ]);
                $albumId = (int) $pdo->lastInsertId();

                try {
                    $pdo->prepare($this->db->insertIgnoreKeyword() . ' INTO album_category (album_id, category_id) VALUES (?, ?)')
                        ->execute([$albumId, $categoryId]);
                } catch (\Throwable) {
                    // The primary category remains set on albums if this optional pivot is unavailable.
                }

                $imageStmt = $pdo->prepare(
                    'INSERT INTO images (album_id, original_path, file_hash, width, height, mime, alt_text, caption, sort_order)
                     VALUES (:album_id, :path, :hash, :width, :height, :mime, :alt, :caption, :sort_order)'
                );
                $coverImageId = null;

                foreach ($sample['photos'] as $photoIndex => $photo) {
                    $sourcePath = $sourceDir . '/' . $photo['file'];
                    $dimensions = @getimagesize($sourcePath);
                    if (!$dimensions || ($dimensions['mime'] ?? '') !== 'image/jpeg') {
                        throw new RuntimeException('Invalid JPEG sample image: ' . $photo['file']);
                    }

                    $hash = hash_file('sha256', $sourcePath);
                    if (!is_string($hash) || $hash === '') {
                        throw new RuntimeException('Could not hash sample image: ' . $photo['file']);
                    }
                    $filename = $hash . '.jpg';
                    $originalPath = $originalDir . '/' . $filename;
                    if (!is_file($originalPath)) {
                        if (!@copy($sourcePath, $originalPath)) {
                            throw new RuntimeException('Could not copy sample image to storage: ' . $photo['file']);
                        }
                        $newOriginals[] = $originalPath;
                    } elseif (hash_file('sha256', $originalPath) !== $hash) {
                        throw new RuntimeException('A different file already exists at ' . $originalPath);
                    }

                    $imageStmt->execute([
                        ':album_id' => $albumId,
                        ':path' => '/storage/originals/' . $filename,
                        ':hash' => $hash,
                        ':width' => (int) $dimensions[0],
                        ':height' => (int) $dimensions[1],
                        ':mime' => 'image/jpeg',
                        ':alt' => $photo['alt'],
                        ':caption' => 'Portfolio design sample — replace before launch.',
                        ':sort_order' => $photoIndex,
                    ]);
                    $imageId = (int) $pdo->lastInsertId();
                    $coverImageId ??= $imageId;

                    $stats = $upload->generateVariantsForImage($imageId);
                    if ($stats['failed'] > 0 || $stats['generated'] < 1) {
                        throw new RuntimeException('Image variants could not be generated for ' . $photo['file']);
                    }
                    foreach ($pdo->query('SELECT path FROM image_variants WHERE image_id = ' . $imageId)->fetchAll(PDO::FETCH_COLUMN) as $path) {
                        $generatedPaths[] = $path;
                    }
                }

                if ($coverImageId !== null) {
                    $pdo->prepare('UPDATE albums SET cover_image_id = ? WHERE id = ?')->execute([$coverImageId, $albumId]);
                }

                $pdo->commit();
                $added++;
                $output->writeln('Added ' . $sample['title'] . ' (' . count($sample['photos']) . ' photo(s)).');
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                foreach ($generatedPaths as $path) {
                    UploadService::safeUnlink($root . '/public' . $path);
                }
                foreach ($newOriginals as $path) {
                    UploadService::safeUnlink($path);
                }
                $output->writeln('<error>Could not add ' . $sample['slug'] . ': ' . $e->getMessage() . '</error>');
                return Command::FAILURE;
            }
        }

        if ($added > 0) {
            try {
                (new PageCacheService(new SettingsService($this->db), $this->db))->clearAll();
            } catch (\Throwable $e) {
                $output->writeln('<comment>Page cache clear failed: ' . $e->getMessage() . '</comment>');
            }
            try {
                \App\Services\NavigationService::invalidateCache();
            } catch (\Throwable) {
                // Best-effort cache invalidation.
            }
        }

        $output->writeln('<info>Done. Added ' . $added . ' sample album(s); existing content was left unchanged.</info>');
        $output->writeln('<comment>Remove the three “Sample — …” albums from Admin → Albums when review is complete.</comment>');
        return Command::SUCCESS;
    }
}
