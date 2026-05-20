import * as $ from 'svelte/internal/server';
import { fade } from 'svelte/transition';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let _0 = $.fallback($$props['_0'], '0');
		let _1 = $.fallback($$props['_1'], '1');
		let _2 = $.fallback($$props['_2'], '2');
		let _3 = $.fallback($$props['_3'], '3');
		let _4 = $.fallback($$props['_4'], '4');
		let _5 = $.fallback($$props['_5'], '5');
		let _6 = $.fallback($$props['_6'], '6');
		let _7 = $.fallback($$props['_7'], '7');
		let _8 = $.fallback($$props['_8'], '8');
		let _9 = $.fallback($$props['_9'], '9');
		let _10 = $.fallback($$props['_10'], '10');
		let _11 = $.fallback($$props['_11'], '11');
		let _12 = $.fallback($$props['_12'], '12');
		let _13 = $.fallback($$props['_13'], '13');
		let _14 = $.fallback($$props['_14'], '14');
		let _15 = $.fallback($$props['_15'], '15');
		let _16 = $.fallback($$props['_16'], '16');
		let _17 = $.fallback($$props['_17'], '17');
		let _18 = $.fallback($$props['_18'], '18');
		let _19 = $.fallback($$props['_19'], '19');
		let _20 = $.fallback($$props['_20'], '20');
		let _21 = $.fallback($$props['_21'], '21');
		let _22 = $.fallback($$props['_22'], '22');
		let _23 = $.fallback($$props['_23'], '23');
		let _24 = $.fallback($$props['_24'], '24');
		let _25 = $.fallback($$props['_25'], '25');
		let _26 = $.fallback($$props['_26'], '26');
		let _27 = $.fallback($$props['_27'], '27');
		let _28 = $.fallback($$props['_28'], '28');
		let _29 = $.fallback($$props['_29'], '29');
		let _30 = $.fallback($$props['_30'], '30');
		let _31 = $.fallback($$props['_31'], '31');
		let _32 = $.fallback($$props['_32'], '32');
		let _33 = $.fallback($$props['_33'], '33');
		let _34 = $.fallback($$props['_34'], '34');
		let _35 = $.fallback($$props['_35'], '35');
		let _36 = $.fallback($$props['_36'], '36');
		let _37 = $.fallback($$props['_37'], '37');
		let _38 = $.fallback($$props['_38'], '38');
		let _39 = $.fallback($$props['_39'], '39');
		let _40 = $.fallback($$props['_40'], '40');
		let _a = $.fallback($$props['_a'], () => ['40'], true);

		$$renderer.push(`<!---->${$.escape(_0)}${$.escape(_1)}${$.escape(_2)}${$.escape(_3)}${$.escape(_4)}${$.escape(_5)}${$.escape(_6)}${$.escape(_7)}${$.escape(_8)}${$.escape(_9)}${$.escape(_10)}${$.escape(_11)}${$.escape(_12)}${$.escape(_13)}${$.escape(_14)}${$.escape(_15)}${$.escape(_16)}${$.escape(_17)}${$.escape(_18)}${$.escape(_19)}${$.escape(_20)}${$.escape(_21)}${$.escape(_22)}${$.escape(_23)}${$.escape(_24)}${$.escape(_25)}${$.escape(_26)}${$.escape(_27)}${$.escape(_28)}${$.escape(_29)}${$.escape(_30)}${$.escape(_31)}${$.escape(_32)}${$.escape(_33)}${$.escape(_34)}${$.escape(_35)}${$.escape(_36)}${$.escape(_37)}${$.escape(_38)}${$.escape(_39)}${$.escape(_40)}

expected: ${$.escape(_a.indexOf(_40) > -1 && _40 === '40' && _39 === '39')} `);

		if (_a.indexOf(_40) > -1 && _40 === '40' && _39 === '39') {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`if: true`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`if: false <div></div>`);
		}

		$$renderer.push(`<!--]-->`);

		$.bind_props($$props, {
			_0,
			_1,
			_2,
			_3,
			_4,
			_5,
			_6,
			_7,
			_8,
			_9,
			_10,
			_11,
			_12,
			_13,
			_14,
			_15,
			_16,
			_17,
			_18,
			_19,
			_20,
			_21,
			_22,
			_23,
			_24,
			_25,
			_26,
			_27,
			_28,
			_29,
			_30,
			_31,
			_32,
			_33,
			_34,
			_35,
			_36,
			_37,
			_38,
			_39,
			_40,
			_a
		});
	});
}