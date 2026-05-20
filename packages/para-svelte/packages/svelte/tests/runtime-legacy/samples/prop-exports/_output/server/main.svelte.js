import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	var $$store_subs;

	let // export multiple subscribables in one line
	u1 = $$props['u1'];

	let s1 = $$props['s1'];
	let u2 = $$props['u2'];
	let s2 = $$props['s2'];
	let p1 = $$props['p1'];
	let p2;
	let p3 = $$props['p3'];

	let // export previously declared props
	// aliased props <component a1={...} a2={...}> assign to v1, v2
	v1 = $$props['a1'];

	let v2 = $$props['a2'];

	// aliased export with initializer
	let vi1 = $.fallback($$props['a3'], v2);

	// aliased subscribable export
	let vs1 = $.fallback($$props['a4'], v1);

	// literal initializer
	let vl0 = $.fallback($$props['vl0'], 'hello');

	// aliased with literal initializer
	let vl1 = $.fallback($$props['a5'], 'test');

	let // aliased store surrounded by non-aliased non-stores
	n1 = $$props['n1'];

	let n2 = $$props['n2'];
	let s3 = $$props['a6'];

	let // keyword exports
	k1 = $$props['for'];

	let k2 = $$props['continue'];

	$$renderer.push(`<!---->$s1=${$.escape($.store_get($$store_subs ??= {}, '$s1', s1))}
$s2=${$.escape($.store_get($$store_subs ??= {}, '$s2', s2))}
p1=${$.escape(p1)}
p3=${$.escape(p3)}
$v1=${$.escape($.store_get($$store_subs ??= {}, '$v1', v1))}
v2=${$.escape(v2)}
vi1=${$.escape(vi1)}
$vs1=${$.escape($.store_get($$store_subs ??= {}, '$vs1', vs1))}
vl0=${$.escape(vl0)}
vl1=${$.escape(vl1)}
$s3=${$.escape($.store_get($$store_subs ??= {}, '$s3', s3))}
${$.escape(k1)}${$.escape(k2)}`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, {
		u1,
		s1,
		u2,
		s2,
		p1,
		p3,
		a1: v1,
		a2: v2,
		a3: vi1,
		a4: vs1,
		vl0,
		a5: vl1,
		n1,
		n2,
		a6: s3,
		for: k1,
		continue: k2
	});
}