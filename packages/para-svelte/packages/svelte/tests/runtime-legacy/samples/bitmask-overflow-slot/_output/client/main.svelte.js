import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Echo from './Echo.svelte';
import { untrack } from "svelte";

var root_1 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const foo = $.mutable_source();
	const bar = $.mutable_source();
	let reads = $.prop($$props, 'reads', 28, () => ({}));
	let _0 = $.prop($$props, '_0', 12, '0');
	let _1 = $.prop($$props, '_1', 12, '1');
	let _2 = $.prop($$props, '_2', 12, '2');
	let _3 = $.prop($$props, '_3', 12, '3');
	let _4 = $.prop($$props, '_4', 12, '4');
	let _5 = $.prop($$props, '_5', 12, '5');
	let _6 = $.prop($$props, '_6', 12, '6');
	let _7 = $.prop($$props, '_7', 12, '7');
	let _8 = $.prop($$props, '_8', 12, '8');
	let _9 = $.prop($$props, '_9', 12, '9');
	let _10 = $.prop($$props, '_10', 12, '10');
	let _11 = $.prop($$props, '_11', 12, '11');
	let _12 = $.prop($$props, '_12', 12, '12');
	let _13 = $.prop($$props, '_13', 12, '13');
	let _14 = $.prop($$props, '_14', 12, '14');
	let _15 = $.prop($$props, '_15', 12, '15');
	let _16 = $.prop($$props, '_16', 12, '16');
	let _17 = $.prop($$props, '_17', 12, '17');
	let _18 = $.prop($$props, '_18', 12, '18');
	let _19 = $.prop($$props, '_19', 12, '19');
	let _20 = $.prop($$props, '_20', 12, '20');
	let _21 = $.prop($$props, '_21', 12, '21');
	let _22 = $.prop($$props, '_22', 12, '22');
	let _23 = $.prop($$props, '_23', 12, '23');
	let _24 = $.prop($$props, '_24', 12, '24');
	let _25 = $.prop($$props, '_25', 12, '25');
	let _26 = $.prop($$props, '_26', 12, '26');
	let _27 = $.prop($$props, '_27', 12, '27');
	let _28 = $.prop($$props, '_28', 12, '28');
	let _29 = $.prop($$props, '_29', 12, '29');
	let _30 = $.prop($$props, '_30', 12, '30');
	let _31 = $.prop($$props, '_31', 12, '31');
	let _32 = $.prop($$props, '_32', 12, '32');
	let _33 = $.prop($$props, '_33', 12, '33');
	let _34 = $.prop($$props, '_34', 12, '34');
	let _35 = $.prop($$props, '_35', 12, '35');
	let _36 = $.prop($$props, '_36', 12, '36');
	let _37 = $.prop($$props, '_37', 12, '37');
	let _38 = $.prop($$props, '_38', 12, '38');
	let _39 = $.prop($$props, '_39', 12, '39');
	let _40 = $.prop($$props, '_40', 12, '40');

	const read = (value, label) => {
		untrack(() => {
			if (!reads()[label]) reads(reads()[label] = 0, true);

			reads(reads()[label] += 1, true);
		});

		return value;
	};

	$.legacy_pre_effect(() => ($.deep_read_state(_6()), $.deep_read_state(_37())), () => {
		$.set(foo, read(_6(), '_6') + ':' + read(_37(), '_37'));
	});

	$.legacy_pre_effect(() => ($.deep_read_state(_38())), () => {
		$.set(bar, read(_38(), '_38'));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get reads() {
			return reads();
		},

		set reads($$value) {
			reads($$value);
			$.flush();
		},

		get _0() {
			return _0();
		},

		set _0($$value) {
			_0($$value);
			$.flush();
		},

		get _1() {
			return _1();
		},

		set _1($$value) {
			_1($$value);
			$.flush();
		},

		get _2() {
			return _2();
		},

		set _2($$value) {
			_2($$value);
			$.flush();
		},

		get _3() {
			return _3();
		},

		set _3($$value) {
			_3($$value);
			$.flush();
		},

		get _4() {
			return _4();
		},

		set _4($$value) {
			_4($$value);
			$.flush();
		},

		get _5() {
			return _5();
		},

		set _5($$value) {
			_5($$value);
			$.flush();
		},

		get _6() {
			return _6();
		},

		set _6($$value) {
			_6($$value);
			$.flush();
		},

		get _7() {
			return _7();
		},

		set _7($$value) {
			_7($$value);
			$.flush();
		},

		get _8() {
			return _8();
		},

		set _8($$value) {
			_8($$value);
			$.flush();
		},

		get _9() {
			return _9();
		},

		set _9($$value) {
			_9($$value);
			$.flush();
		},

		get _10() {
			return _10();
		},

		set _10($$value) {
			_10($$value);
			$.flush();
		},

		get _11() {
			return _11();
		},

		set _11($$value) {
			_11($$value);
			$.flush();
		},

		get _12() {
			return _12();
		},

		set _12($$value) {
			_12($$value);
			$.flush();
		},

		get _13() {
			return _13();
		},

		set _13($$value) {
			_13($$value);
			$.flush();
		},

		get _14() {
			return _14();
		},

		set _14($$value) {
			_14($$value);
			$.flush();
		},

		get _15() {
			return _15();
		},

		set _15($$value) {
			_15($$value);
			$.flush();
		},

		get _16() {
			return _16();
		},

		set _16($$value) {
			_16($$value);
			$.flush();
		},

		get _17() {
			return _17();
		},

		set _17($$value) {
			_17($$value);
			$.flush();
		},

		get _18() {
			return _18();
		},

		set _18($$value) {
			_18($$value);
			$.flush();
		},

		get _19() {
			return _19();
		},

		set _19($$value) {
			_19($$value);
			$.flush();
		},

		get _20() {
			return _20();
		},

		set _20($$value) {
			_20($$value);
			$.flush();
		},

		get _21() {
			return _21();
		},

		set _21($$value) {
			_21($$value);
			$.flush();
		},

		get _22() {
			return _22();
		},

		set _22($$value) {
			_22($$value);
			$.flush();
		},

		get _23() {
			return _23();
		},

		set _23($$value) {
			_23($$value);
			$.flush();
		},

		get _24() {
			return _24();
		},

		set _24($$value) {
			_24($$value);
			$.flush();
		},

		get _25() {
			return _25();
		},

		set _25($$value) {
			_25($$value);
			$.flush();
		},

		get _26() {
			return _26();
		},

		set _26($$value) {
			_26($$value);
			$.flush();
		},

		get _27() {
			return _27();
		},

		set _27($$value) {
			_27($$value);
			$.flush();
		},

		get _28() {
			return _28();
		},

		set _28($$value) {
			_28($$value);
			$.flush();
		},

		get _29() {
			return _29();
		},

		set _29($$value) {
			_29($$value);
			$.flush();
		},

		get _30() {
			return _30();
		},

		set _30($$value) {
			_30($$value);
			$.flush();
		},

		get _31() {
			return _31();
		},

		set _31($$value) {
			_31($$value);
			$.flush();
		},

		get _32() {
			return _32();
		},

		set _32($$value) {
			_32($$value);
			$.flush();
		},

		get _33() {
			return _33();
		},

		set _33($$value) {
			_33($$value);
			$.flush();
		},

		get _34() {
			return _34();
		},

		set _34($$value) {
			_34($$value);
			$.flush();
		},

		get _35() {
			return _35();
		},

		set _35($$value) {
			_35($$value);
			$.flush();
		},

		get _36() {
			return _36();
		},

		set _36($$value) {
			_36($$value);
			$.flush();
		},

		get _37() {
			return _37();
		},

		set _37($$value) {
			_37($$value);
			$.flush();
		},

		get _38() {
			return _38();
		},

		set _38($$value) {
			_38($$value);
			$.flush();
		},

		get _39() {
			return _39();
		},

		set _39($$value) {
			_39($$value);
			$.flush();
		},

		get _40() {
			return _40();
		},

		set _40($$value) {
			_40($$value);
			$.flush();
		}
	};

	$.init();

	Echo($$anchor, {
		get dummy() {
			return _0();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const dummy = $.derived_safe_equal(() => $$slotProps.dummy);
				var fragment_1 = root_1();
				var p = $.first_child(fragment_1);
				var text = $.child(p, true);

				$.reset(p);

				var p_1 = $.sibling(p, 2);
				var text_1 = $.child(p_1, true);

				$.reset(p_1);

				var p_2 = $.sibling(p_1, 2);
				var text_2 = $.child(p_2, true);

				$.reset(p_2);

				var p_3 = $.sibling(p_2, 2);
				var text_3 = $.child(p_3, true);

				$.reset(p_3);

				var p_4 = $.sibling(p_3, 2);
				var text_4 = $.child(p_4, true);

				$.reset(p_4);

				var p_5 = $.sibling(p_4, 2);
				var text_5 = $.child(p_5, true);

				$.reset(p_5);

				var p_6 = $.sibling(p_5, 2);
				var text_6 = $.child(p_6, true);

				$.reset(p_6);

				var p_7 = $.sibling(p_6, 2);
				var text_7 = $.child(p_7, true);

				$.reset(p_7);

				var p_8 = $.sibling(p_7, 2);
				var text_8 = $.child(p_8, true);

				$.reset(p_8);

				var p_9 = $.sibling(p_8, 2);
				var text_9 = $.child(p_9, true);

				$.reset(p_9);

				var p_10 = $.sibling(p_9, 2);
				var text_10 = $.child(p_10, true);

				$.reset(p_10);

				var p_11 = $.sibling(p_10, 2);
				var text_11 = $.child(p_11, true);

				$.reset(p_11);

				var p_12 = $.sibling(p_11, 2);
				var text_12 = $.child(p_12, true);

				$.reset(p_12);

				var p_13 = $.sibling(p_12, 2);
				var text_13 = $.child(p_13, true);

				$.reset(p_13);

				var p_14 = $.sibling(p_13, 2);
				var text_14 = $.child(p_14, true);

				$.reset(p_14);

				var p_15 = $.sibling(p_14, 2);
				var text_15 = $.child(p_15, true);

				$.reset(p_15);

				var p_16 = $.sibling(p_15, 2);
				var text_16 = $.child(p_16, true);

				$.reset(p_16);

				var p_17 = $.sibling(p_16, 2);
				var text_17 = $.child(p_17, true);

				$.reset(p_17);

				var p_18 = $.sibling(p_17, 2);
				var text_18 = $.child(p_18, true);

				$.reset(p_18);

				var p_19 = $.sibling(p_18, 2);
				var text_19 = $.child(p_19, true);

				$.reset(p_19);

				var p_20 = $.sibling(p_19, 2);
				var text_20 = $.child(p_20, true);

				$.reset(p_20);

				var p_21 = $.sibling(p_20, 2);
				var text_21 = $.child(p_21, true);

				$.reset(p_21);

				var p_22 = $.sibling(p_21, 2);
				var text_22 = $.child(p_22, true);

				$.reset(p_22);

				var p_23 = $.sibling(p_22, 2);
				var text_23 = $.child(p_23, true);

				$.reset(p_23);

				var p_24 = $.sibling(p_23, 2);
				var text_24 = $.child(p_24, true);

				$.reset(p_24);

				var p_25 = $.sibling(p_24, 2);
				var text_25 = $.child(p_25, true);

				$.reset(p_25);

				var p_26 = $.sibling(p_25, 2);
				var text_26 = $.child(p_26, true);

				$.reset(p_26);

				var p_27 = $.sibling(p_26, 2);
				var text_27 = $.child(p_27, true);

				$.reset(p_27);

				var p_28 = $.sibling(p_27, 2);
				var text_28 = $.child(p_28, true);

				$.reset(p_28);

				var p_29 = $.sibling(p_28, 2);
				var text_29 = $.child(p_29, true);

				$.reset(p_29);

				var p_30 = $.sibling(p_29, 2);
				var text_30 = $.child(p_30, true);

				$.reset(p_30);

				var p_31 = $.sibling(p_30, 2);
				var text_31 = $.child(p_31, true);

				$.reset(p_31);

				var p_32 = $.sibling(p_31, 2);
				var text_32 = $.child(p_32, true);

				$.reset(p_32);

				var p_33 = $.sibling(p_32, 2);
				var text_33 = $.child(p_33, true);

				$.reset(p_33);

				var p_34 = $.sibling(p_33, 2);
				var text_34 = $.child(p_34, true);

				$.reset(p_34);

				var p_35 = $.sibling(p_34, 2);
				var text_35 = $.child(p_35, true);

				$.reset(p_35);

				var p_36 = $.sibling(p_35, 2);
				var text_36 = $.child(p_36, true);

				$.reset(p_36);

				var p_37 = $.sibling(p_36, 2);
				var text_37 = $.child(p_37, true);

				$.reset(p_37);

				var p_38 = $.sibling(p_37, 2);
				var text_38 = $.child(p_38, true);

				$.reset(p_38);

				var p_39 = $.sibling(p_38, 2);
				var text_39 = $.child(p_39, true);

				$.reset(p_39);

				var p_40 = $.sibling(p_39, 2);
				var text_40 = $.child(p_40, true);

				$.reset(p_40);

				var p_41 = $.sibling(p_40, 2);
				var text_41 = $.child(p_41, true);

				$.reset(p_41);

				var p_42 = $.sibling(p_41, 2);
				var text_42 = $.child(p_42, true);

				$.reset(p_42);

				var p_43 = $.sibling(p_42, 2);
				var text_43 = $.child(p_43, true);

				$.reset(p_43);

				var p_44 = $.sibling(p_43, 2);
				var text_44 = $.child(p_44, true);

				$.reset(p_44);

				$.template_effect(
					(
						$0,
						$1,
						$2,
						$3,
						$4,
						$5,
						$6,
						$7,
						$8,
						$9,
						$10,
						$11,
						$12,
						$13,
						$14,
						$15,
						$16,
						$17,
						$18,
						$19,
						$20,
						$21,
						$22,
						$23,
						$24,
						$25,
						$26,
						$27,
						$28,
						$29,
						$30,
						$31,
						$32,
						$33,
						$34,
						$35,
						$36,
						$37,
						$38,
						$39,
						$40,
						$41
					) => {
						$.set_text(text, $0);
						$.set_text(text_1, $1);
						$.set_text(text_2, $2);
						$.set_text(text_3, $3);
						$.set_text(text_4, $4);
						$.set_text(text_5, $5);
						$.set_text(text_6, $6);
						$.set_text(text_7, $7);
						$.set_text(text_8, $8);
						$.set_text(text_9, $9);
						$.set_text(text_10, $10);
						$.set_text(text_11, $11);
						$.set_text(text_12, $12);
						$.set_text(text_13, $13);
						$.set_text(text_14, $14);
						$.set_text(text_15, $15);
						$.set_text(text_16, $16);
						$.set_text(text_17, $17);
						$.set_text(text_18, $18);
						$.set_text(text_19, $19);
						$.set_text(text_20, $20);
						$.set_text(text_21, $21);
						$.set_text(text_22, $22);
						$.set_text(text_23, $23);
						$.set_text(text_24, $24);
						$.set_text(text_25, $25);
						$.set_text(text_26, $26);
						$.set_text(text_27, $27);
						$.set_text(text_28, $28);
						$.set_text(text_29, $29);
						$.set_text(text_30, $30);
						$.set_text(text_31, $31);
						$.set_text(text_32, $32);
						$.set_text(text_33, $33);
						$.set_text(text_34, $34);
						$.set_text(text_35, $35);
						$.set_text(text_36, $36);
						$.set_text(text_37, $37);
						$.set_text(text_38, $38);
						$.set_text(text_39, $39);
						$.set_text(text_40, $40);
						$.set_text(text_41, $41);
						$.set_text(text_42, $.get(foo));
						$.set_text(text_43, $.get(bar));
						$.set_text(text_44, $.get(dummy));
					},
					[
						() => ($.deep_read_state(_0()), $.untrack(() => read(_0(), '_0'))),
						() => ($.deep_read_state(_1()), $.untrack(() => read(_1(), '_1'))),
						() => ($.deep_read_state(_2()), $.untrack(() => read(_2(), '_2'))),
						() => ($.deep_read_state(_3()), $.untrack(() => read(_3(), '_3'))),
						() => ($.deep_read_state(_4()), $.untrack(() => read(_4(), '_4'))),
						() => ($.deep_read_state(_5()), $.untrack(() => read(_5(), '_5'))),
						() => ($.deep_read_state(_6()), $.untrack(() => read(_6(), '_6'))),
						() => ($.deep_read_state(_7()), $.untrack(() => read(_7(), '_7'))),
						() => ($.deep_read_state(_8()), $.untrack(() => read(_8(), '_8'))),
						() => ($.deep_read_state(_9()), $.untrack(() => read(_9(), '_9'))),
						() => (
							$.deep_read_state(_10()),
							$.untrack(() => read(_10(), '_10'))
						),

						() => (
							$.deep_read_state(_11()),
							$.untrack(() => read(_11(), '_11'))
						),

						() => (
							$.deep_read_state(_12()),
							$.untrack(() => read(_12(), '_12'))
						),

						() => (
							$.deep_read_state(_13()),
							$.untrack(() => read(_13(), '_13'))
						),

						() => (
							$.deep_read_state(_14()),
							$.untrack(() => read(_14(), '_14'))
						),

						() => (
							$.deep_read_state(_15()),
							$.untrack(() => read(_15(), '_15'))
						),

						() => (
							$.deep_read_state(_16()),
							$.untrack(() => read(_16(), '_16'))
						),

						() => (
							$.deep_read_state(_17()),
							$.untrack(() => read(_17(), '_17'))
						),

						() => (
							$.deep_read_state(_18()),
							$.untrack(() => read(_18(), '_18'))
						),

						() => (
							$.deep_read_state(_19()),
							$.untrack(() => read(_19(), '_19'))
						),

						() => (
							$.deep_read_state(_20()),
							$.untrack(() => read(_20(), '_20'))
						),

						() => (
							$.deep_read_state(_21()),
							$.untrack(() => read(_21(), '_21'))
						),

						() => (
							$.deep_read_state(_22()),
							$.untrack(() => read(_22(), '_22'))
						),

						() => (
							$.deep_read_state(_23()),
							$.untrack(() => read(_23(), '_23'))
						),

						() => (
							$.deep_read_state(_24()),
							$.untrack(() => read(_24(), '_24'))
						),

						() => (
							$.deep_read_state(_25()),
							$.untrack(() => read(_25(), '_25'))
						),

						() => (
							$.deep_read_state(_26()),
							$.untrack(() => read(_26(), '_26'))
						),

						() => (
							$.deep_read_state(_27()),
							$.untrack(() => read(_27(), '_27'))
						),

						() => (
							$.deep_read_state(_28()),
							$.untrack(() => read(_28(), '_28'))
						),

						() => (
							$.deep_read_state(_29()),
							$.untrack(() => read(_29(), '_29'))
						),

						() => (
							$.deep_read_state(_30()),
							$.untrack(() => read(_30(), '_30'))
						),

						() => (
							$.deep_read_state(_31()),
							$.untrack(() => read(_31(), '_31'))
						),

						() => (
							$.deep_read_state(_32()),
							$.untrack(() => read(_32(), '_32'))
						),

						() => (
							$.deep_read_state(_33()),
							$.untrack(() => read(_33(), '_33'))
						),

						() => (
							$.deep_read_state(_34()),
							$.untrack(() => read(_34(), '_34'))
						),

						() => (
							$.deep_read_state(_35()),
							$.untrack(() => read(_35(), '_35'))
						),

						() => (
							$.deep_read_state(_36()),
							$.untrack(() => read(_36(), '_36'))
						),

						() => (
							$.deep_read_state(_37()),
							$.untrack(() => read(_37(), '_37'))
						),

						() => (
							$.deep_read_state(_38()),
							$.untrack(() => read(_38(), '_38'))
						),

						() => (
							$.deep_read_state(_39()),
							$.untrack(() => read(_39(), '_39'))
						),

						() => (
							$.deep_read_state(_40()),
							$.untrack(() => read(_40(), '_40'))
						),

						() => (
							$.deep_read_state(_5()),
							$.deep_read_state(_36()),
							$.untrack(() => read(_5(), '_5') + ':' + read(_36(), '_36'))
						)
					]
				);

				$.append($$anchor, fragment_1);
			}
		}
	});

	return $.pop($$exports);
}