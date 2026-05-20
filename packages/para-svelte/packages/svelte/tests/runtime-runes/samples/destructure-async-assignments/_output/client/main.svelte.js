import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Update me!</button> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	let b = $.state(0);
	let c = $.state(0);
	let d = $.state(0);
	let e = $.state(0);
	let f = $.state(0);
	let g = $.state(0);
	let h = $.state(0);
	let i = $.state(0);
	let j = $.state(0);
	let k = $.state(0);
	let l = $.state(0);
	let m = $.state(0);
	let n = $.state(0);
	let o = $.state(0);
	let p = $.state(0);
	let q = $.state(0);
	let r = $.state(0);
	let s = $.state(0);
	let t = $.state(0);
	let u = $.state(0);
	let v = $.state(0);
	let w = $.state(0);
	let x = $.state(0);
	let y = $.state(0);
	let z = $.state(0);

	const get_vwx = () => {
		return Promise.resolve({ v: 22, rest: [23, 24] });
	};

	const get_y = () => {
		return Promise.resolve([24, 25]);
	};

	const some = { fn: () => {} };

	const update = async () => {
		await (async ($$value) => {
			var $$array = $.to_array($$value, 2);

			$.set(a, $$array[0], true);
			$.set(b, $$array[1], true);
		})([1, await Promise.resolve(2)]);

		await (async ($$value) => {
			$.set(c, await $.fallback($$value.c, () => Promise.resolve(3), true), true);
			$.set(d, $$value.d, true);
		})({ d: 4 });

		await (async ($$value) => {
			var $$array_1 = $.to_array($$value, 1);

			$.set(e, $$array_1[0], true);
		})([await Promise.resolve(2) + await Promise.resolve(3)]);

		await (async ($$value) => {
			$.set(f, await $.fallback($$value.f, async () => false || await Promise.resolve(6), true), true);
		})({});

		let func = Promise.resolve(() => 7);

		await (async ($$value) => {
			var $$array_2 = $.to_array($$value, 1);

			$.set(g, await $.fallback($$array_2[0], async () => (await func)(), true), true);
		})([]);

		let mult = (a, b) => a * b;

		await (async ($$value) => {
			$.set(h, $$value.h, true);
		})({ h: mult(2, await Promise.resolve(4)) });

		await (async ($$value) => {
			var $$array_3 = $.to_array($$value, 1);

			$.set(i, $$array_3[0], true);
		})([new Date(await Promise.resolve(9)).getTime()]);

		await (async ($$value) => {
			var $$array_4 = $.to_array($$value, 1);

			$.set(j, await $.fallback($$array_4[0], async () => "19" ? 10 : await Promise.resolve(11), true), true);
		})([]);

		let obj = await (async ($$value) => {
			$.set(k, $$value[await Promise.resolve("prop")], true);

			return $$value;
		})({ prop: 11 });

		await (async ($$value) => {
			var $$array_5 = $.to_array($$value, 1);

			$.set(l, await $.fallback($$array_5[0], async () => obj[await Promise.resolve("prop")] + 1, true), true);
		})([]);

		await (async ($$value) => {
			var $$array_6 = $.to_array($$value, 1);

			$.set(m, $$array_6[0], true);
		})([`${1}${await Promise.resolve("3")}`]);

		await (async ($$value) => {
			var $$array_7 = $.to_array($$value, 1);

			$.set(n, $$array_7[0], true);
		})([-await Promise.resolve(-14)]);

		await (async ($$value) => {
			var $$array_8 = $.to_array($$value, 1);

			$.set(o, $$array_8[0], true);
		})([(some.fn(), await Promise.resolve(15))]);

		(
			$.set(p, await $.fallback(obj.anotherprop, () => Promise.resolve(16), true), true)
		);

		let val1, val2;

		await (async ($$value) => {
			val1 = $.fallback(
				$$value.val1,
				() => (async function (x) {
					return await x;
				})(Promise.resolve(18)),
				true
			);

			$.set(r, await $.fallback($$value.r, val1), true);
		})(await (async ($$value) => {
			val2 = $.fallback($$value.val2, () => (async (x) => await x)(Promise.resolve(17)), true);
			$.set(q, await $.fallback($$value.q, val2), true);

			return $$value;
		})([]));

		await (async ($$value) => {
			$.set(u, $.fallback($$value.u, 21), true);
		})(await (async ($$value) => {
			$.set(t, await $.fallback($$value.t, () => Promise.resolve(20), true), true);

			return $$value;
		})(await (async ($$value) => {
			var $$array_9 = $.to_array($$value, 1);

			$.set(s, $$array_9[0], true);

			return $$value;
		})([await Promise.resolve(19)])));

		await (async ($$value) => {
			var $$array_10 = $.to_array($$value.rest, 1);

			$.set(v, $$value.v, true);
			$.set(w, $$array_10[0], true);
		})(await get_vwx());

		await (async ($$value) => {
			var $$array_11 = $.to_array($$value);

			$.set(x, $$array_11[0], true);
			$.set(y, $$array_11[1], true);
			$.set(z, $.fallback($$array_11.slice(2).z, 26), true);
		})(await get_y());
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var p_1 = $.sibling(button, 2);
	var text = $.child(p_1, true);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_1 = $.child(p_2, true);

	$.reset(p_2);

	var p_3 = $.sibling(p_2, 2);
	var text_2 = $.child(p_3, true);

	$.reset(p_3);

	var p_4 = $.sibling(p_3, 2);
	var text_3 = $.child(p_4, true);

	$.reset(p_4);

	var p_5 = $.sibling(p_4, 2);
	var text_4 = $.child(p_5, true);

	$.reset(p_5);

	var p_6 = $.sibling(p_5, 2);
	var text_5 = $.child(p_6, true);

	$.reset(p_6);

	var p_7 = $.sibling(p_6, 2);
	var text_6 = $.child(p_7, true);

	$.reset(p_7);

	var p_8 = $.sibling(p_7, 2);
	var text_7 = $.child(p_8, true);

	$.reset(p_8);

	var p_9 = $.sibling(p_8, 2);
	var text_8 = $.child(p_9, true);

	$.reset(p_9);

	var p_10 = $.sibling(p_9, 2);
	var text_9 = $.child(p_10, true);

	$.reset(p_10);

	var p_11 = $.sibling(p_10, 2);
	var text_10 = $.child(p_11, true);

	$.reset(p_11);

	var p_12 = $.sibling(p_11, 2);
	var text_11 = $.child(p_12, true);

	$.reset(p_12);

	var p_13 = $.sibling(p_12, 2);
	var text_12 = $.child(p_13, true);

	$.reset(p_13);

	var p_14 = $.sibling(p_13, 2);
	var text_13 = $.child(p_14, true);

	$.reset(p_14);

	var p_15 = $.sibling(p_14, 2);
	var text_14 = $.child(p_15, true);

	$.reset(p_15);

	var p_16 = $.sibling(p_15, 2);
	var text_15 = $.child(p_16, true);

	$.reset(p_16);

	var p_17 = $.sibling(p_16, 2);
	var text_16 = $.child(p_17, true);

	$.reset(p_17);

	var p_18 = $.sibling(p_17, 2);
	var text_17 = $.child(p_18, true);

	$.reset(p_18);

	var p_19 = $.sibling(p_18, 2);
	var text_18 = $.child(p_19, true);

	$.reset(p_19);

	var p_20 = $.sibling(p_19, 2);
	var text_19 = $.child(p_20, true);

	$.reset(p_20);

	var p_21 = $.sibling(p_20, 2);
	var text_20 = $.child(p_21, true);

	$.reset(p_21);

	var p_22 = $.sibling(p_21, 2);
	var text_21 = $.child(p_22, true);

	$.reset(p_22);

	var p_23 = $.sibling(p_22, 2);
	var text_22 = $.child(p_23, true);

	$.reset(p_23);

	var p_24 = $.sibling(p_23, 2);
	var text_23 = $.child(p_24, true);

	$.reset(p_24);

	var p_25 = $.sibling(p_24, 2);
	var text_24 = $.child(p_25, true);

	$.reset(p_25);

	var p_26 = $.sibling(p_25, 2);
	var text_25 = $.child(p_26, true);

	$.reset(p_26);

	$.template_effect(() => {
		$.set_text(text, $.get(a));
		$.set_text(text_1, $.get(b));
		$.set_text(text_2, $.get(c));
		$.set_text(text_3, $.get(d));
		$.set_text(text_4, $.get(e));
		$.set_text(text_5, $.get(f));
		$.set_text(text_6, $.get(g));
		$.set_text(text_7, $.get(h));
		$.set_text(text_8, $.get(i));
		$.set_text(text_9, $.get(j));
		$.set_text(text_10, $.get(k));
		$.set_text(text_11, $.get(l));
		$.set_text(text_12, $.get(m));
		$.set_text(text_13, $.get(n));
		$.set_text(text_14, $.get(o));
		$.set_text(text_15, $.get(p));
		$.set_text(text_16, $.get(q));
		$.set_text(text_17, $.get(r));
		$.set_text(text_18, $.get(s));
		$.set_text(text_19, $.get(t));
		$.set_text(text_20, $.get(u));
		$.set_text(text_21, $.get(v));
		$.set_text(text_22, $.get(w));
		$.set_text(text_23, $.get(x));
		$.set_text(text_24, $.get(y));
		$.set_text(text_25, $.get(z));
	});

	$.event('click', button, update);
	$.append($$anchor, fragment);
	$.pop();
}