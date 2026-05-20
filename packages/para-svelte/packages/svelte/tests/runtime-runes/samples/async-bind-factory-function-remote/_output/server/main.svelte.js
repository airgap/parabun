import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const checkedFactory = () => {
			return () => checked();
		};

		function indirectCheckedFactory() {
			return checkedFactory();
		}

		function callFactory(factory) {
			return factory();
		}

		function indirectCallFactory() {
			return callFactory(indirectCheckedFactory);
		}

		function indirectChecked2() {
			const indirect = () => checkedFactory()();

			return indirect;
		}

		var checked;

		var $$promises = $$renderer.run([
			async () => checked = await $.async_derived(() => new Promise((r) => setTimeout(() => r(true)), 10))
		]);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(checkedFactory()())));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(indirectCheckedFactory()())));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(callFactory(checkedFactory)())));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(indirectCallFactory()())));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(indirectChecked2()())));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}