import * as $ from 'svelte/internal/server';

export default function Echo($$renderer, $$props) {
	let dummy;
	let d1 = $.fallback($$props['d1'], 'd1');
	let d2 = $.fallback($$props['d2'], 'd2');
	let d3 = $.fallback($$props['d3'], 'd3');
	let d4 = $.fallback($$props['d4'], 'd4');
	let d5 = $.fallback($$props['d5'], 'd5');
	let d6 = $.fallback($$props['d6'], 'd6');
	let d7 = $.fallback($$props['d7'], 'd7');
	let d8 = $.fallback($$props['d8'], 'd8');
	let d9 = $.fallback($$props['d9'], 'd9');
	let d10 = $.fallback($$props['d10'], 'd10');
	let d11 = $.fallback($$props['d11'], 'd11');
	let d12 = $.fallback($$props['d12'], 'd12');
	let d13 = $.fallback($$props['d13'], 'd13');
	let d14 = $.fallback($$props['d14'], 'd14');
	let d15 = $.fallback($$props['d15'], 'd15');
	let d16 = $.fallback($$props['d16'], 'd16');
	let d17 = $.fallback($$props['d17'], 'd17');
	let d18 = $.fallback($$props['d18'], 'd18');
	let d19 = $.fallback($$props['d19'], 'd19');
	let d20 = $.fallback($$props['d20'], 'd20');
	let d21 = $.fallback($$props['d21'], 'd21');
	let d22 = $.fallback($$props['d22'], 'd22');
	let d23 = $.fallback($$props['d23'], 'd23');
	let d24 = $.fallback($$props['d24'], 'd24');
	let d25 = $.fallback($$props['d25'], 'd25');
	let d26 = $.fallback($$props['d26'], 'd26');
	let d27 = $.fallback($$props['d27'], 'd27');
	let d28 = $.fallback($$props['d28'], 'd28');
	let d29 = $.fallback($$props['d29'], 'd29');
	let d30 = $.fallback($$props['d30'], 'd30');
	let d31 = $.fallback($$props['d31'], 'd31');
	let d32 = $.fallback($$props['d32'], 'd32');
	let d33 = $.fallback($$props['d33'], 'd33');

	$: dummy = d32 + ':' + d33;

	$$renderer.push(`<p>${$.escape(d1)}</p> <p>${$.escape(d2)}</p> <p>${$.escape(d3)}</p> <p>${$.escape(d4)}</p> <p>${$.escape(d5)}</p> <p>${$.escape(d6)}</p> <p>${$.escape(d7)}</p> <p>${$.escape(d8)}</p> <p>${$.escape(d9)}</p> <p>${$.escape(d10)}</p> <p>${$.escape(d11)}</p> <p>${$.escape(d12)}</p> <p>${$.escape(d13)}</p> <p>${$.escape(d14)}</p> <p>${$.escape(d15)}</p> <p>${$.escape(d16)}</p> <p>${$.escape(d17)}</p> <p>${$.escape(d18)}</p> <p>${$.escape(d19)}</p> <p>${$.escape(d20)}</p> <p>${$.escape(d21)}</p> <p>${$.escape(d22)}</p> <p>${$.escape(d23)}</p> <p>${$.escape(d24)}</p> <p>${$.escape(d25)}</p> <p>${$.escape(d26)}</p> <p>${$.escape(d27)}</p> <p>${$.escape(d28)}</p> <p>${$.escape(d29)}</p> <p>${$.escape(d30)}</p> <p>${$.escape(d31)}</p> <p>${$.escape(d32)}</p> <p>${$.escape(d33)}</p> <!--[-->`);
	$.slot($$renderer, $$props, 'default', { dummy }, null);
	$$renderer.push(`<!--]-->`);

	$.bind_props($$props, {
		d1,
		d2,
		d3,
		d4,
		d5,
		d6,
		d7,
		d8,
		d9,
		d10,
		d11,
		d12,
		d13,
		d14,
		d15,
		d16,
		d17,
		d18,
		d19,
		d20,
		d21,
		d22,
		d23,
		d24,
		d25,
		d26,
		d27,
		d28,
		d29,
		d30,
		d31,
		d32,
		d33
	});
}