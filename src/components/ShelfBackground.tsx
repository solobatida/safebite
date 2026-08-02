import { View, ImageBackground, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

/** Fraction of the photo height to hide (supermarket aisle at the top). */
const CROP_TOP_RATIO = 0.22;
const LOGO_SIZE = 188;

const supermarketShelves = require('../../assets/images/supermarket-shelves.png');

/** Supermarket shelf photo behind the welcome card */
export function ShelfBackground({
  logo,
  children,
}: {
  logo?: React.ReactNode;
  children: React.ReactNode;
}) {
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
        <View style={styles.hero}>
          {logo ? <View style={styles.logoSlot}>{logo}</View> : null}
          <View style={[styles.card, logo ? styles.cardWithLogo : null]}>{children}</View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  hero: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  logoSlot: {
    position: 'absolute',
    top: -(LOGO_SIZE / 2),
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cardWithLogo: {
    paddingTop: LOGO_SIZE / 2 + 4,
  },
});
