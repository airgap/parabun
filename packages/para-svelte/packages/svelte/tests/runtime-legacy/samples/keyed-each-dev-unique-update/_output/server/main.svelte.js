Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let data = [[0, 0], [0, 4], [1, 4]];

			function add() {
				const n = [0, 0];

				data.push(n);
				data = data;
			}

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 15, 0);
			$$renderer.push(`add</button>`);
			$.pop_element();
			$$renderer.push(` <ul>`);
			$.push_element($$renderer, 'ul', 17, 0);
			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(data);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let d = each_array[$$index];

				$$renderer.push(`<li>`);
				$.push_element($$renderer, 'li', 19, 3);
				$$renderer.push(`${$.escape(d)}</li>`);
				$.pop_element();
			}

			$$renderer.push(`<!--]--></ul>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;