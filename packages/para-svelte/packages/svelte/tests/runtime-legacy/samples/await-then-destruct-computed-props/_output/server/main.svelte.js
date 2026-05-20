import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let object = $.fallback(
		$$props['object'],
		() => Promise.resolve({
			prop1: { prop4: 2, prop5: 3 },
			prop2: { prop6: 5, prop7: 6, prop8: 7 },
			prop3: { prop9: 9, prop10: 10 }
		}),
		true
	);

	const objectReject = Promise.reject({ propZ: 5, propY: 6, propX: 7, propW: 8 });
	let num = 1;
	const prop = 'prop';

	$.await($$renderer, object, () => {}, (
		{
			[`prop${num++}`]: { [`prop${num + 3}`]: propA },
			[`prop${num++}`]: { [`prop${num + 5}`]: propB },
			...rest
		}
	) => {
		$$renderer.push(`<p>propA: ${$.escape(propA)}</p> <p>propB: ${$.escape(propB)}</p> <p>num: ${$.escape(num)}</p> <p>rest: ${$.escape(JSON.stringify(rest))}</p>`);
	});

	$$renderer.push(`<!--]--> `);

	$.await($$renderer, objectReject, () => {}, (value) => {
		$$renderer.push(`resolved`);
	});

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { object });
}