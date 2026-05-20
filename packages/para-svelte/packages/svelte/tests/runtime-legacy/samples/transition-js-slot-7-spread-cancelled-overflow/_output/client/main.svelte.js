import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<div> </div> <!> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a1 = $.prop($$props, 'a1', 12, 0);
	let a2 = $.prop($$props, 'a2', 12, 0);
	let a3 = $.prop($$props, 'a3', 12, 0);
	let a4 = $.prop($$props, 'a4', 12, 0);
	let a5 = $.prop($$props, 'a5', 12, 0);
	let a6 = $.prop($$props, 'a6', 12, 0);
	let a7 = $.prop($$props, 'a7', 12, 0);
	let a8 = $.prop($$props, 'a8', 12, 0);
	let a9 = $.prop($$props, 'a9', 12, 0);
	let a10 = $.prop($$props, 'a10', 12, 0);
	let a11 = $.prop($$props, 'a11', 12, 0);
	let a12 = $.prop($$props, 'a12', 12, 0);
	let a13 = $.prop($$props, 'a13', 12, 0);
	let a14 = $.prop($$props, 'a14', 12, 0);
	let a15 = $.prop($$props, 'a15', 12, 0);
	let a16 = $.prop($$props, 'a16', 12, 0);
	let a17 = $.prop($$props, 'a17', 12, 0);
	let a18 = $.prop($$props, 'a18', 12, 0);
	let a19 = $.prop($$props, 'a19', 12, 0);
	let a20 = $.prop($$props, 'a20', 12, 0);
	let a21 = $.prop($$props, 'a21', 12, 0);
	let a22 = $.prop($$props, 'a22', 12, 0);
	let a23 = $.prop($$props, 'a23', 12, 0);
	let a24 = $.prop($$props, 'a24', 12, 0);
	let a25 = $.prop($$props, 'a25', 12, 0);
	let a26 = $.prop($$props, 'a26', 12, 0);
	let a27 = $.prop($$props, 'a27', 12, 0);
	let a28 = $.prop($$props, 'a28', 12, 0);
	let a29 = $.prop($$props, 'a29', 12, 0);
	let a30 = $.prop($$props, 'a30', 12, 0);
	let a31 = $.prop($$props, 'a31', 12, 0);
	let a32 = $.prop($$props, 'a32', 12, 0);
	let a33 = $.prop($$props, 'a33', 12, 0);
	let visible = $.mutable_source(true);
	let state = $.mutable_source('Foo');
	let slotProps = $.mutable_source({ slotProps: 'Foo' });
	let props = $.prop($$props, 'props', 12);

	function show() {
		$.set(visible, true);
	}

	function hide() {
		$.set(visible, false);
		$.set(state, 'Bar');
		$.set(slotProps, { slotProps: 'Bar' });
	}

	var $$exports = {
		show,
		hide,
		get a1() {
			return a1();
		},

		set a1($$value) {
			a1($$value);
			$.flush();
		},

		get a2() {
			return a2();
		},

		set a2($$value) {
			a2($$value);
			$.flush();
		},

		get a3() {
			return a3();
		},

		set a3($$value) {
			a3($$value);
			$.flush();
		},

		get a4() {
			return a4();
		},

		set a4($$value) {
			a4($$value);
			$.flush();
		},

		get a5() {
			return a5();
		},

		set a5($$value) {
			a5($$value);
			$.flush();
		},

		get a6() {
			return a6();
		},

		set a6($$value) {
			a6($$value);
			$.flush();
		},

		get a7() {
			return a7();
		},

		set a7($$value) {
			a7($$value);
			$.flush();
		},

		get a8() {
			return a8();
		},

		set a8($$value) {
			a8($$value);
			$.flush();
		},

		get a9() {
			return a9();
		},

		set a9($$value) {
			a9($$value);
			$.flush();
		},

		get a10() {
			return a10();
		},

		set a10($$value) {
			a10($$value);
			$.flush();
		},

		get a11() {
			return a11();
		},

		set a11($$value) {
			a11($$value);
			$.flush();
		},

		get a12() {
			return a12();
		},

		set a12($$value) {
			a12($$value);
			$.flush();
		},

		get a13() {
			return a13();
		},

		set a13($$value) {
			a13($$value);
			$.flush();
		},

		get a14() {
			return a14();
		},

		set a14($$value) {
			a14($$value);
			$.flush();
		},

		get a15() {
			return a15();
		},

		set a15($$value) {
			a15($$value);
			$.flush();
		},

		get a16() {
			return a16();
		},

		set a16($$value) {
			a16($$value);
			$.flush();
		},

		get a17() {
			return a17();
		},

		set a17($$value) {
			a17($$value);
			$.flush();
		},

		get a18() {
			return a18();
		},

		set a18($$value) {
			a18($$value);
			$.flush();
		},

		get a19() {
			return a19();
		},

		set a19($$value) {
			a19($$value);
			$.flush();
		},

		get a20() {
			return a20();
		},

		set a20($$value) {
			a20($$value);
			$.flush();
		},

		get a21() {
			return a21();
		},

		set a21($$value) {
			a21($$value);
			$.flush();
		},

		get a22() {
			return a22();
		},

		set a22($$value) {
			a22($$value);
			$.flush();
		},

		get a23() {
			return a23();
		},

		set a23($$value) {
			a23($$value);
			$.flush();
		},

		get a24() {
			return a24();
		},

		set a24($$value) {
			a24($$value);
			$.flush();
		},

		get a25() {
			return a25();
		},

		set a25($$value) {
			a25($$value);
			$.flush();
		},

		get a26() {
			return a26();
		},

		set a26($$value) {
			a26($$value);
			$.flush();
		},

		get a27() {
			return a27();
		},

		set a27($$value) {
			a27($$value);
			$.flush();
		},

		get a28() {
			return a28();
		},

		set a28($$value) {
			a28($$value);
			$.flush();
		},

		get a29() {
			return a29();
		},

		set a29($$value) {
			a29($$value);
			$.flush();
		},

		get a30() {
			return a30();
		},

		set a30($$value) {
			a30($$value);
			$.flush();
		},

		get a31() {
			return a31();
		},

		set a31($$value) {
			a31($$value);
			$.flush();
		},

		get a32() {
			return a32();
		},

		set a32($$value) {
			a32($$value);
			$.flush();
		},

		get a33() {
			return a33();
		},

		set a33($$value) {
			a33($$value);
			$.flush();
		},

		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var node = $.sibling(div, 2);

	Nested(node, {
		get visible() {
			return $.get(visible);
		},

		get slotProps() {
			return $.get(slotProps);
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const slotProps = $.derived_safe_equal(() => $$slotProps.slotProps);

				$.next();

				var text_1 = $.text();

				$.template_effect(() => $.set_text(text_1, `inside ${$.get(state) ?? ''} ${props() ?? ''} ${$.get(slotProps) ?? ''}`));
				$.append($$anchor, text_1);
			}
		}
	});

	var text_2 = $.sibling(node);

	$.template_effect(() => {
		$.set_text(text, `outside ${$.get(state) ?? ''} ${props() ?? ''} ${(
			$.get(slotProps),
			$.untrack(() => $.get(slotProps).slotProps)
		) ?? ''}`);

		$.set_text(text_2, ` ${a1() + a2() + a3() + a4() + a5() + a6() + a7() + a8() + a9() + a10() + a11() + a12() + a13() + a14() + a15() + a16() + a17() + a18() + a19() + a20() + a21() + a22() + a23() + a24() + a25() + a26() + a27() + a28() + a29() + a30() + a31() + a32() + a33()}`);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'show', show);
	$.bind_prop($$props, 'hide', hide);

	return $.pop($$exports);
}