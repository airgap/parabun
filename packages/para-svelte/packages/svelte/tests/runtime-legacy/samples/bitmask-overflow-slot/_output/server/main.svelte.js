import * as $ from 'svelte/internal/server';
import Echo from './Echo.svelte';
import { untrack } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo, bar;
		let reads = $.fallback($$props['reads'], () => ({}), true);
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

		const read = (value, label) => {
			untrack(() => {
				if (!reads[label]) reads[label] = 0;

				reads[label] += 1;
			});

			return value;
		};

		$: foo = read(_6, '_6') + ':' + read(_37, '_37');
		$: bar = read(_38, '_38');

		Echo($$renderer, {
			dummy: _0,
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$renderer, { dummy }) => {
					$$renderer.push(`<p>${$.escape(read(_0, '_0'))}</p> <p>${$.escape(read(_1, '_1'))}</p> <p>${$.escape(read(_2, '_2'))}</p> <p>${$.escape(read(_3, '_3'))}</p> <p>${$.escape(read(_4, '_4'))}</p> <p>${$.escape(read(_5, '_5'))}</p> <p>${$.escape(read(_6, '_6'))}</p> <p>${$.escape(read(_7, '_7'))}</p> <p>${$.escape(read(_8, '_8'))}</p> <p>${$.escape(read(_9, '_9'))}</p> <p>${$.escape(read(_10, '_10'))}</p> <p>${$.escape(read(_11, '_11'))}</p> <p>${$.escape(read(_12, '_12'))}</p> <p>${$.escape(read(_13, '_13'))}</p> <p>${$.escape(read(_14, '_14'))}</p> <p>${$.escape(read(_15, '_15'))}</p> <p>${$.escape(read(_16, '_16'))}</p> <p>${$.escape(read(_17, '_17'))}</p> <p>${$.escape(read(_18, '_18'))}</p> <p>${$.escape(read(_19, '_19'))}</p> <p>${$.escape(read(_20, '_20'))}</p> <p>${$.escape(read(_21, '_21'))}</p> <p>${$.escape(read(_22, '_22'))}</p> <p>${$.escape(read(_23, '_23'))}</p> <p>${$.escape(read(_24, '_24'))}</p> <p>${$.escape(read(_25, '_25'))}</p> <p>${$.escape(read(_26, '_26'))}</p> <p>${$.escape(read(_27, '_27'))}</p> <p>${$.escape(read(_28, '_28'))}</p> <p>${$.escape(read(_29, '_29'))}</p> <p>${$.escape(read(_30, '_30'))}</p> <p>${$.escape(read(_31, '_31'))}</p> <p>${$.escape(read(_32, '_32'))}</p> <p>${$.escape(read(_33, '_33'))}</p> <p>${$.escape(read(_34, '_34'))}</p> <p>${$.escape(read(_35, '_35'))}</p> <p>${$.escape(read(_36, '_36'))}</p> <p>${$.escape(read(_37, '_37'))}</p> <p>${$.escape(read(_38, '_38'))}</p> <p>${$.escape(read(_39, '_39'))}</p> <p>${$.escape(read(_40, '_40'))}</p> <p>${$.escape(read(_5, '_5') + ':' + read(_36, '_36'))}</p> <p>${$.escape(foo)}</p> <p>${$.escape(bar)}</p> <p>${$.escape(dummy)}</p>`);
				}
			}
		});

		$.bind_props($$props, {
			reads,
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
			_40
		});
	});
}