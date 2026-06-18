import { View, Image, ImageBackground, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

/** Fraction of the photo height to hide (supermarket aisle at the top). */
const CROP_TOP_RATIO = 0.22;

const supermarketShelves = require('../../assets/images/supermarket-shelves.png');
const boomBurst = require('../../assets/images/boom-burst.png');

/** Supermarket shelf photo + comic burst behind the welcome card */
export function ShelfBackground({ children }: { children: React.ReactNode }) {
  const imageHeight = `${100 / (1 - CROP_TOP_RATIO)}%`;
  const imageTop = `${(-CROP_TOP_RATIO / (1 - CROP_TOP_RATIO)) * 100}%`;

  return (
    <View style={styles.root}>
      <View style={styles.imageClip}>
        <ImageBackground
          source={supermarketShelves}
          style={[styles.image, { height: imageHeight, top: imageTop }]}
          resizeMode="cover"
        />
      </View>
      <View style={styles.scrim} />
      <View style={styles.content}>
        <View style={styles.heroStack}>
          <Image
            source={boomBurst}
            style={styles.boomBurst}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.card}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2a2a2a',
  },
  imageClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heroStack: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-2deg' }],
  },
  /** Comic burst behind the card — transparent PNG, slightly larger than the box */
  boomBurst: {
    position: 'absolute',
    width: '185%',
    aspectRatio: 1,
    zIndex: 0,
  },
  card: {
    width: '100%',
    zIndex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
