import React, { memo, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import FormulaMath from './FormulaMath';
import { useTheme } from '../theme/ThemeContext';

const SUPPORTED_TYPES = new Set([
  'heading',
  'paragraph',
  'instruction',
  'question',
  'subquestion',
  'image',
  'diagram',
  'table',
  'equation',
  'numbered-list',
  'bullet-list',
  'caption',
  'note',
  'divider',
  'page-break',
  'section',
]);

const getText = (block = {}) => {
  const value = [block.text, block.value, block.title, block.label, block.content]
    .find((entry) => typeof entry === 'string' || typeof entry === 'number');
  return value === undefined || value === null ? '' : String(value);
};

const getAssetUrl = (asset = {}) =>
  asset.url || asset.secure_url || asset.previewUrl || asset.fileUrl || asset.downloadUrl || '';

const getBlockCaption = (block = {}, asset = {}) =>
  block.caption || asset.caption || asset.title || '';

const orderedBlocks = (blocks = []) =>
  [...(Array.isArray(blocks) ? blocks : [])].sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left?.order)) ? Number(left.order) : 0;
    const rightOrder = Number.isFinite(Number(right?.order)) ? Number(right.order) : 0;
    return leftOrder - rightOrder;
  });

const shouldSkipCaption = (blocks, index) => {
  const block = blocks[index];
  if (block?.type !== 'caption') return false;
  const previous = blocks[index - 1];
  if (!previous || !['image', 'diagram'].includes(previous.type)) return false;
  const caption = getText(block).trim();
  return Boolean(caption && caption === String(previous.caption || '').trim());
};

const normalizeListItems = (block = {}) => {
  if (Array.isArray(block.items)) return block.items;
  if (Array.isArray(block.children)) return block.children;
  return [];
};

const normalizeTable = (block = {}) => {
  const columns = Array.isArray(block.columns) ? block.columns : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  return { columns, rows };
};

const levelStyleKey = (level) => {
  const safeLevel = Math.min(Math.max(Number(level) || 2, 1), 6);
  if (safeLevel <= 1) return 'heading1';
  if (safeLevel === 2) return 'heading2';
  return 'heading3';
};

function PastQuestionDocumentReader({
  document = {},
  onOpenOriginal,
  canOpenOriginal = false,
  readingProgress = 0,
  onLayout,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [lightboxFigure, setLightboxFigure] = useState(null);
  const content = useMemo(() => orderedBlocks(document.content), [document.content]);
  const assetMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(document.assets) ? document.assets : []).forEach((asset) => {
      if (asset?.id) map.set(asset.id, asset);
    });
    return map;
  }, [document.assets]);

  const progress = Math.min(Math.max(Number(readingProgress) || 0, 0), 100);
  const meta = [
    document.courseCode || document.course,
    document.courseTitle,
    document.department || document.dept,
    document.level,
    document.semester || document.examSession || document.session,
    document.year,
    document.examType,
  ].filter(Boolean);
  const hasOriginal = Boolean(canOpenOriginal || document.originalFile?.url);

  if (document.status && document.status !== 'published') {
    return (
      <ReaderEmptyState
        icon="lock-closed-outline"
        title="This paper is not available yet."
        text="Only published past questions can be opened by students."
        styles={styles}
        colors={colors}
      />
    );
  }

  if (!content.length) {
    return (
      <ReaderEmptyState
        icon="document-text-outline"
        title="This document is not available yet."
        text="The readable document content has not been published for this paper."
        styles={styles}
        colors={colors}
        hasOriginal={hasOriginal}
        onOpenOriginal={onOpenOriginal}
      />
    );
  }

  return (
    <View style={styles.reader} onLayout={onLayout}>
      <View style={styles.readerHeader}>
        <View style={styles.readerTopRow}>
          <View style={styles.readerKicker}>
            <Ionicons name="school-outline" size={14} color={colors.brand} />
            <Text style={styles.readerEyebrow}>Past Question</Text>
          </View>
          {hasOriginal ? (
            <Pressable
              style={({ pressed }) => [styles.originalButton, pressed && styles.pressed]}
              onPress={onOpenOriginal}
              accessibilityRole="button"
              accessibilityLabel="View original paper"
            >
              <Ionicons name="document-text-outline" size={15} color={colors.brand} />
              <Text style={styles.originalButtonText}>Original Paper</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.readerTitle}>{document.title || document.name || 'Past Question'}</Text>
        {meta.length ? <Text style={styles.readerMeta}>{meta.join('  |  ')}</Text> : null}

        <View style={styles.progressRow} accessibilityLabel={`Reading progress ${progress}%`}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>

      <View style={styles.documentBody}>
        {content.map((block, index) => shouldSkipCaption(content, index) ? null : (
          <DocumentBlock
            key={block.id || `${block.type || 'block'}-${index}`}
            block={block}
            index={index}
            depth={0}
            assetMap={assetMap}
            styles={styles}
            colors={colors}
            onOpenImage={setLightboxFigure}
          />
        ))}
      </View>

      <FigureLightbox
        figure={lightboxFigure}
        onClose={() => setLightboxFigure(null)}
        styles={styles}
      />
    </View>
  );
}

function ReaderEmptyState({ icon, title, text, styles, colors, hasOriginal = false, onOpenOriginal }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={24} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {hasOriginal ? (
        <Pressable
          style={({ pressed }) => [styles.emptyOriginalButton, pressed && styles.pressed]}
          onPress={onOpenOriginal}
          accessibilityRole="button"
          accessibilityLabel="View original paper"
        >
          <Ionicons name="document-text-outline" size={15} color={colors.brand} />
          <Text style={styles.originalButtonText}>View original paper</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DocumentBlock({ block = {}, index = 0, depth = 0, assetMap, styles, colors, onOpenImage }) {
  if (!SUPPORTED_TYPES.has(block.type)) {
    return (
      <View style={styles.unsupportedBlock}>
        <Text style={styles.mutedText}>Unsupported document content</Text>
      </View>
    );
  }

  if (block.type === 'heading') {
    return <Text style={[styles[levelStyleKey(block.level)], depth > 0 && styles.nestedHeading]}>{getText(block)}</Text>;
  }

  if (block.type === 'paragraph') {
    return <Text style={styles.paragraph}>{getText(block)}</Text>;
  }

  if (block.type === 'instruction') {
    return (
      <View style={styles.instructionBox}>
        <Text style={styles.calloutLabel}>Instructions</Text>
        <Text style={styles.calloutText}>{getText(block)}</Text>
      </View>
    );
  }

  if (block.type === 'question' || block.type === 'subquestion') {
    return (
      <QuestionBlock
        block={block}
        depth={depth}
        assetMap={assetMap}
        styles={styles}
        colors={colors}
        onOpenImage={onOpenImage}
      />
    );
  }

  if (block.type === 'image' || block.type === 'diagram') {
    return <VisualBlock block={block} assetMap={assetMap} styles={styles} colors={colors} onOpenImage={onOpenImage} />;
  }

  if (block.type === 'table') {
    return <TableBlock block={block} styles={styles} />;
  }

  if (block.type === 'equation') {
    const source = getText(block);
    return (
      <View style={styles.equationBox}>
        {source ? <FormulaMath source={source} size="compact" backgroundColor="transparent" /> : <Text style={styles.mutedText}>Equation unavailable</Text>}
      </View>
    );
  }

  if (block.type === 'numbered-list' || block.type === 'bullet-list') {
    return <ListBlock block={block} ordered={block.type === 'numbered-list'} styles={styles} />;
  }

  if (block.type === 'caption') {
    return <Text style={styles.caption}>{getText(block)}</Text>;
  }

  if (block.type === 'note') {
    return (
      <View style={styles.noteBox}>
        <Text style={styles.calloutLabel}>Note</Text>
        <Text style={styles.calloutText}>{getText(block)}</Text>
      </View>
    );
  }

  if (block.type === 'section') {
    const children = orderedBlocks(block.blocks || block.children);
    return (
      <View style={styles.sectionBlock}>
        {getText(block) ? <Text style={styles.sectionTitle}>{getText(block)}</Text> : null}
        {children.map((child, childIndex) => shouldSkipCaption(children, childIndex) ? null : (
          <DocumentBlock
            key={child.id || `section-${index}-${childIndex}`}
            block={child}
            index={childIndex}
            depth={depth + 1}
            assetMap={assetMap}
            styles={styles}
            colors={colors}
            onOpenImage={onOpenImage}
          />
        ))}
      </View>
    );
  }

  if (block.type === 'divider') return <View style={styles.divider} />;
  if (block.type === 'page-break') return <View style={styles.pageBreak} />;
  return null;
}

function QuestionBlock({ block, depth, assetMap, styles, colors, onOpenImage }) {
  const children = orderedBlocks(block.blocks || block.children);
  const body = getText(block);
  const number = block.number || block.label || '';
  const isSubquestion = block.type === 'subquestion';
  const isTopLevel = block.type === 'question' && depth === 0;
  const prefixValue = number;
  const prefix = prefixValue ? (isSubquestion ? `(${prefixValue})` : `${prefixValue}.`) : '';

  if (isTopLevel) {
    return (
      <View style={styles.questionCard}>
        <View style={styles.questionHeaderRow}>
          <Text style={styles.questionLabel}>{prefixValue ? `Question ${prefixValue}` : 'Question'}</Text>
        </View>
        {body ? <Text style={styles.questionText}>{body}</Text> : null}
        {children.map((child, childIndex) => shouldSkipCaption(children, childIndex) ? null : (
          <DocumentBlock
            key={child.id || `${block.id || 'question'}-${childIndex}`}
            block={child}
            index={childIndex}
            depth={depth + 1}
            assetMap={assetMap}
            styles={styles}
            colors={colors}
            onOpenImage={onOpenImage}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.subQuestionBlock, depth > 1 && styles.deepSubQuestion]}>
      <View style={styles.questionRow}>
        {prefix ? <Text style={styles.subQuestionPrefix}>{prefix}</Text> : null}
        <View style={styles.questionContent}>
          {body ? <Text style={styles.subQuestionText}>{body}</Text> : null}
          {children.map((child, childIndex) => shouldSkipCaption(children, childIndex) ? null : (
            <DocumentBlock
              key={child.id || `${block.id || 'subquestion'}-${childIndex}`}
              block={child}
              index={childIndex}
              depth={depth + 1}
              assetMap={assetMap}
              styles={styles}
              colors={colors}
              onOpenImage={onOpenImage}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function VisualBlock({ block, assetMap, styles, colors, onOpenImage }) {
  const [failed, setFailed] = useState(false);
  const asset = block.assetId ? assetMap.get(block.assetId) : null;
  const url = getAssetUrl(asset) || getAssetUrl(block);
  const caption = getBlockCaption(block, asset);
  const altText = block.altText || asset?.altText || caption || 'Document image';

  if (!url || failed) {
    return (
      <View style={styles.imageUnavailable}>
        <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.mutedText}>{block.type === 'diagram' ? 'Diagram unavailable' : 'Image unavailable'}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.visualBlock}>
      <Pressable
        style={({ pressed }) => [styles.figurePressable, pressed && styles.pressed]}
        onPress={() => onOpenImage?.({ url, caption, altText })}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${altText}. Open full screen`}
      >
        <Image
          source={{ uri: url }}
          style={styles.documentImage}
          contentFit="contain"
          cachePolicy="disk"
          transition={200}
          accessibilityLabel={altText}
          onError={() => setFailed(true)}
        />
        <View style={styles.expandHint}>
          <Ionicons name="expand-outline" size={14} color={colors.textSecondary} />
        </View>
      </Pressable>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

function FigureLightbox({ figure, onClose, styles }) {
  return (
    <Modal visible={Boolean(figure)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.lightbox}>
        <View style={styles.lightboxHeader}>
          <Pressable
            style={({ pressed }) => [styles.lightboxClose, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close image"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
        {figure?.url ? (
          <Image
            source={{ uri: figure.url }}
            style={styles.lightboxImage}
            contentFit="contain"
            cachePolicy="disk"
            accessibilityLabel={figure.altText || 'Document image'}
          />
        ) : null}
        {figure?.caption ? <Text style={styles.lightboxCaption}>{figure.caption}</Text> : null}
        <Pressable style={styles.lightboxBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close image backdrop" />
      </View>
    </Modal>
  );
}

function TableBlock({ block, styles }) {
  const { columns, rows } = normalizeTable(block);
  if (!columns.length && !rows.length) {
    return <Text style={styles.mutedText}>Table unavailable</Text>;
  }

  const columnCount = Math.max(columns.length, ...rows.map((row) => Array.isArray(row) ? row.length : 0), 1);
  const safeColumns = columns.length ? columns : Array.from({ length: columnCount }, (_, index) => `Column ${index + 1}`);

  return (
    <View style={styles.tableBlock}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {safeColumns.map((column, index) => (
              <Text key={`head-${index}`} style={[styles.tableCell, styles.tableHeaderCell]}>{String(column || '')}</Text>
            ))}
          </View>
          {rows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.tableRow}>
              {safeColumns.map((_, cellIndex) => (
                <Text key={`cell-${rowIndex}-${cellIndex}`} style={styles.tableCell}>{String(row?.[cellIndex] || '')}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
    </View>
  );
}

function ListBlock({ block, ordered, styles }) {
  const items = normalizeListItems(block);
  if (!items.length) return null;

  return (
    <View style={styles.listBlock}>
      {items.map((item, index) => (
        <View key={`${ordered ? 'number' : 'bullet'}-${index}`} style={styles.listRow}>
          <Text style={styles.listMarker}>{ordered ? `${index + 1}.` : '\u2022'}</Text>
          <Text style={styles.listText}>{typeof item === 'string' ? item : getText(item)}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  reader: {
    gap: 18,
  },
  readerHeader: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 6,
  },
  readerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  readerKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readerEyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
  },
  readerMeta: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
  },
  originalButton: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.surfaceSecondary || colors.card,
  },
  emptyOriginalButton: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSecondary || colors.card,
  },
  originalButtonText: {
    color: colors.brand,
    fontSize: 12.5,
    fontWeight: '900',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.borderDefault,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  progressText: {
    width: 36,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
  },
  documentBody: {
    gap: 15,
  },
  heading1: {
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  heading2: {
    color: colors.textPrimary,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 4,
  },
  heading3: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  nestedHeading: {
    marginTop: 8,
  },
  paragraph: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 26,
  },
  instructionBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    backgroundColor: colors.brandLight || colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  noteBox: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceSecondary || colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  calloutLabel: {
    color: colors.brand,
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutText: {
    color: colors.textPrimary,
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '700',
  },
  questionCard: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 14,
    gap: 12,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionLabel: {
    color: colors.brand,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  questionContent: {
    flex: 1,
    gap: 10,
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 16.5,
    lineHeight: 27,
    fontWeight: '700',
  },
  subQuestionBlock: {
    paddingTop: 2,
  },
  deepSubQuestion: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderDefault,
  },
  subQuestionPrefix: {
    minWidth: 28,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 25,
    fontWeight: '900',
  },
  subQuestionText: {
    color: colors.textPrimary,
    fontSize: 15.5,
    lineHeight: 25,
    fontWeight: '600',
  },
  visualBlock: {
    gap: 6,
  },
  figurePressable: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary || colors.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  documentImage: {
    width: '100%',
    height: 218,
    backgroundColor: colors.surfaceSecondary || colors.borderDefault,
  },
  expandHint: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  imageUnavailable: {
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 5,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tableBlock: {
    gap: 7,
  },
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    width: 142,
    minHeight: 42,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 12.5,
    lineHeight: 17,
  },
  tableHeaderCell: {
    backgroundColor: colors.surfaceSecondary || colors.card,
    fontWeight: '900',
  },
  equationBox: {
    minHeight: 84,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary || colors.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  listBlock: {
    gap: 7,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  listMarker: {
    width: 24,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 25,
    fontWeight: '900',
  },
  listText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 25,
  },
  sectionBlock: {
    gap: 12,
    paddingTop: 4,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: 8,
  },
  pageBreak: {
    height: 1,
    backgroundColor: colors.borderDefault,
    opacity: 0.55,
    marginVertical: 8,
  },
  unsupportedBlock: {
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary || colors.card,
    padding: 10,
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
  },
  lightboxHeader: {
    position: 'absolute',
    top: 48,
    right: 18,
    zIndex: 3,
  },
  lightboxClose: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  lightboxImage: {
    width: '100%',
    height: '76%',
  },
  lightboxCaption: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  pressed: {
    opacity: 0.82,
  },
});

export default memo(PastQuestionDocumentReader);
