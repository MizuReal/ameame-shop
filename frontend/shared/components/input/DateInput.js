/**
 * DateInput.js
 * ─────────────────────────────────────────────────────────────
 * A tappable date field that opens a modal with scroll-wheel
 * pickers for year, month, and day. Emits a "YYYY-MM-DD" string.
 *
 * Props:
 *   label       string
 *   value       string — "YYYY-MM-DD" or ""
 *   onChange     (dateString: string) => void
 *   placeholder string
 *   error       string
 *   minYear     number   default: 2020
 *   maxYear     number   default: 2035
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarBlankIcon } from "phosphor-react-native";

import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { fonts } from "@typography/fonts";
import Modal from "@components/overlay/Modal";
import Button from "@components/action/Button";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function parseValue(value, minYear) {
  if (!value) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  const [y, m, d] = value.split("-").map(Number);
  return {
    year: y || minYear,
    month: m || 1,
    day: d || 1,
  };
}

function WheelColumn({ data, selectedIndex, onSelect, tokens, formatItem }) {
  const listRef = useRef(null);
  const isMomentumRef = useRef(false);

  const handleMomentumEnd = useCallback(
    (e) => {
      isMomentumRef.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, data.length - 1));
      onSelect(clamped);
    },
    [data.length, onSelect]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isMomentumRef.current = true;
  }, []);

  const getItemLayout = useCallback(
    (_, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const isSelected = index === selectedIndex;
      return (
        <Pressable
          onPress={() => {
            onSelect(index);
            listRef.current?.scrollToIndex({ index, animated: true });
          }}
          style={s.wheelItem}
        >
          <Text
            style={[
              s.wheelText,
              {
                color: isSelected
                  ? rgb(tokens["--text-neutral-primary"])
                  : rgb(tokens["--text-neutral-tertiary"]),
                fontFamily: isSelected ? fonts.ui.bold : fonts.ui.regular,
              },
            ]}
          >
            {formatItem ? formatItem(item) : item}
          </Text>
        </Pressable>
      );
    },
    [selectedIndex, tokens, onSelect, formatItem]
  );

  return (
    <View style={s.wheelWrap}>
      {/* Selection highlight band */}
      <View
        pointerEvents="none"
        style={[
          s.selectionBand,
          {
            top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
            backgroundColor: rgb(tokens["--surface-neutral-subtle"]),
          },
        ]}
      />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item, i) => `${item}-${i}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        initialScrollIndex={selectedIndex}
      />
    </View>
  );
}

export default function DateInput({
  label,
  value = "",
  onChange,
  placeholder = "Select date",
  error,
  minYear = 2020,
  maxYear = 2035,
}) {
  const tokens = useColors();
  const [modalVisible, setModalVisible] = useState(false);

  const parsed = useMemo(() => parseValue(value, minYear), [value, minYear]);
  const [tempYear, setTempYear] = useState(parsed.year);
  const [tempMonth, setTempMonth] = useState(parsed.month);
  const [tempDay, setTempDay] = useState(parsed.day);

  const years = useMemo(() => {
    const list = [];
    for (let y = minYear; y <= maxYear; y++) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const days = useMemo(() => {
    const count = daysInMonth(tempYear, tempMonth);
    const list = [];
    for (let d = 1; d <= count; d++) list.push(d);
    return list;
  }, [tempYear, tempMonth]);

  const monthIndices = useMemo(() => MONTHS.map((_, i) => i + 1), []);

  const openPicker = useCallback(() => {
    const p = parseValue(value, minYear);
    setTempYear(p.year);
    setTempMonth(p.month);
    setTempDay(p.day);
    setModalVisible(true);
  }, [value, minYear]);

  const handleConfirm = useCallback(() => {
    const maxDay = daysInMonth(tempYear, tempMonth);
    const safeDay = Math.min(tempDay, maxDay);
    const dateStr = `${tempYear}-${pad(tempMonth)}-${pad(safeDay)}`;
    onChange?.(dateStr);
    setModalVisible(false);
  }, [tempYear, tempMonth, tempDay, onChange]);

  const handleClear = useCallback(() => {
    onChange?.("");
    setModalVisible(false);
  }, [onChange]);

  const borderColor = error
    ? rgb(tokens["--border-error-primary"])
    : rgb(tokens["--border-neutral-secondary"]);

  const bgColor = error
    ? rgb(tokens["--surface-error-secondary"])
    : rgb(tokens["--base-canvas"]);

  return (
    <View style={s.container}>
      {label && (
        <Text style={[s.label, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
          {label.toUpperCase()}
        </Text>
      )}

      <Pressable
        onPress={openPicker}
        style={[s.inputWrap, { borderColor, backgroundColor: bgColor }]}
      >
        <Text
          style={[
            s.inputText,
            {
              color: value
                ? rgb(tokens["--text-neutral-primary"])
                : rgb(tokens["--shared-placeholder"]),
            },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <View style={s.iconSlot}>
          <CalendarBlankIcon size={16} color={rgb(tokens["--icon-neutral-secondary"])} />
        </View>
      </Pressable>

      {error ? (
        <Text style={[s.message, { color: rgb(tokens["--text-error-primary"]) }]}>{error}</Text>
      ) : null}

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} width="sm">
        <View style={s.modalContent}>
          <Text style={[s.modalTitle, { color: rgb(tokens["--text-neutral-primary"]) }]}>
            Select Date
          </Text>

          <View style={[s.pickerRow, { height: PICKER_HEIGHT }]}>
            <WheelColumn
              data={years}
              selectedIndex={years.indexOf(tempYear)}
              onSelect={(i) => setTempYear(years[i])}
              tokens={tokens}
            />
            <WheelColumn
              data={monthIndices}
              selectedIndex={tempMonth - 1}
              onSelect={(i) => setTempMonth(monthIndices[i])}
              tokens={tokens}
              formatItem={(m) => MONTHS[m - 1]}
            />
            <WheelColumn
              data={days}
              selectedIndex={Math.min(tempDay - 1, days.length - 1)}
              onSelect={(i) => setTempDay(days[i])}
              tokens={tokens}
            />
          </View>

          <View style={s.modalActions}>
            <Button label="Clear" variant="ghost" size="sm" onPress={handleClear} />
            <Button label="Confirm" variant="primary" size="sm" onPress={handleConfirm} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    letterSpacing: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1.5,
  },
  inputText: {
    flex: 1,
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconSlot: {
    paddingRight: 12,
    paddingLeft: 4,
  },
  message: {
    fontFamily: fonts.ui.medium,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 15,
    textAlign: "center",
  },
  pickerRow: {
    flexDirection: "row",
    gap: 4,
    overflow: "hidden",
  },
  wheelWrap: {
    flex: 1,
    overflow: "hidden",
  },
  selectionBand: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 6,
    zIndex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelText: {
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
