-- Migration 1.4.38 (SQLite) — portfolio work streams and starter projects
--
-- The public homepage exposes three curated work streams. Keep the seed
-- idempotent so an update cannot create duplicate categories or projects.

INSERT INTO categories (name, slug, sort_order)
SELECT 'Concept', 'concept', 10
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'concept');

INSERT INTO categories (name, slug, sort_order)
SELECT 'Event', 'event', 11
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'event');

INSERT INTO categories (name, slug, sort_order)
SELECT 'Wedding', 'wedding', 12
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'wedding');

-- Move current portfolio albums into their canonical work streams.
UPDATE albums SET category_id = (SELECT id FROM categories WHERE slug = 'concept')
WHERE slug IN ('chan-dung-anh-nhin-cu-chi', 'chuyen-dong-phia-sau-khung-hinh');

UPDATE albums SET category_id = (SELECT id FROM categories WHERE slug = 'event')
WHERE slug IN ('khong-gian-anh-den-va-huong-vi', 'doi-thuong-nhung-khoang-lang');

UPDATE albums SET category_id = (SELECT id FROM categories WHERE slug = 'wedding')
WHERE slug = 'nghi-le-ngay-vui';

-- Rebuild secondary links so old taxonomy labels do not leak into the new
-- work-stream navigation.
DELETE FROM album_category
WHERE album_id IN (
  SELECT id FROM albums
  WHERE slug IN (
    'chan-dung-anh-nhin-cu-chi',
    'chuyen-dong-phia-sau-khung-hinh',
    'khong-gian-anh-den-va-huong-vi',
    'doi-thuong-nhung-khoang-lang',
    'nghi-le-ngay-vui'
  )
);

INSERT INTO album_category (album_id, category_id)
SELECT a.id, c.id
FROM albums a
JOIN categories c ON c.slug = CASE
  WHEN a.slug IN ('chan-dung-anh-nhin-cu-chi', 'chuyen-dong-phia-sau-khung-hinh') THEN 'concept'
  WHEN a.slug IN ('khong-gian-anh-den-va-huong-vi', 'doi-thuong-nhung-khoang-lang') THEN 'event'
  WHEN a.slug = 'nghi-le-ngay-vui' THEN 'wedding'
END
WHERE a.slug IN (
  'chan-dung-anh-nhin-cu-chi',
  'chuyen-dong-phia-sau-khung-hinh',
  'khong-gian-anh-den-va-huong-vi',
  'doi-thuong-nhung-khoang-lang',
  'nghi-le-ngay-vui'
)
  AND NOT EXISTS (
    SELECT 1 FROM album_category ac
    WHERE ac.album_id = a.id AND ac.category_id = c.id
  );

-- Empty, published project references. They intentionally have no cover or
-- images yet; frames can be uploaded later from the admin album editor.
INSERT INTO albums (title, slug, category_id, excerpt, is_published, sort_order)
SELECT 'Concept Project 01', 'concept-project-01', id,
       'Placeholder project — add images when this concept is ready.', 1, 100
FROM categories
WHERE slug = 'concept'
  AND NOT EXISTS (SELECT 1 FROM albums WHERE slug = 'concept-project-01');

INSERT INTO albums (title, slug, category_id, excerpt, is_published, sort_order)
SELECT 'Concept Project 02', 'concept-project-02', id,
       'Placeholder project — add images when this concept is ready.', 1, 101
FROM categories
WHERE slug = 'concept'
  AND NOT EXISTS (SELECT 1 FROM albums WHERE slug = 'concept-project-02');

INSERT INTO albums (title, slug, category_id, excerpt, is_published, sort_order)
SELECT 'Event Project 01', 'event-project-01', id,
       'Placeholder project — add images when this event is ready.', 1, 100
FROM categories
WHERE slug = 'event'
  AND NOT EXISTS (SELECT 1 FROM albums WHERE slug = 'event-project-01');

INSERT INTO albums (title, slug, category_id, excerpt, is_published, sort_order)
SELECT 'Event Project 02', 'event-project-02', id,
       'Placeholder project — add images when this event is ready.', 1, 101
FROM categories
WHERE slug = 'event'
  AND NOT EXISTS (SELECT 1 FROM albums WHERE slug = 'event-project-02');

INSERT INTO albums (title, slug, category_id, excerpt, is_published, sort_order)
SELECT 'Wedding Project 01', 'wedding-project-01', id,
       'Placeholder project — add images when this wedding is ready.', 1, 100
FROM categories
WHERE slug = 'wedding'
  AND NOT EXISTS (SELECT 1 FROM albums WHERE slug = 'wedding-project-01');

INSERT INTO albums (title, slug, category_id, excerpt, is_published, sort_order)
SELECT 'Wedding Project 02', 'wedding-project-02', id,
       'Placeholder project — add images when this wedding is ready.', 1, 101
FROM categories
WHERE slug = 'wedding'
  AND NOT EXISTS (SELECT 1 FROM albums WHERE slug = 'wedding-project-02');

INSERT INTO album_category (album_id, category_id)
SELECT a.id, c.id
FROM albums a
JOIN categories c ON c.slug = CASE
  WHEN a.slug LIKE 'concept-project-%' THEN 'concept'
  WHEN a.slug LIKE 'event-project-%' THEN 'event'
  WHEN a.slug LIKE 'wedding-project-%' THEN 'wedding'
END
WHERE a.slug IN (
  'concept-project-01', 'concept-project-02',
  'event-project-01', 'event-project-02',
  'wedding-project-01', 'wedding-project-02'
)
  AND NOT EXISTS (
    SELECT 1 FROM album_category ac
    WHERE ac.album_id = a.id AND ac.category_id = c.id
  );
