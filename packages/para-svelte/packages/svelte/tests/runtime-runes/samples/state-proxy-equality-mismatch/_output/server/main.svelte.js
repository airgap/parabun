import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let primitive = 'foo';
			let object = {};
			let array = [primitive, object];

			$$renderer.push(`<button>`);
			$.push_element($$renderer, 'button', 8, 0);
			$$renderer.push(`array.includes(primitive)</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 9, 0);
			$$renderer.push(`array.includes(object)</button>`);
			$.pop_element();
			$$renderer.push(` <hr/>`);
			$.push_element($$renderer, 'hr', 11, 0);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 13, 0);
			$$renderer.push(`array.indexOf(primitive)</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 14, 0);
			$$renderer.push(`array.indexOf(object)</button>`);
			$.pop_element();
			$$renderer.push(` <hr/>`);
			$.push_element($$renderer, 'hr', 16, 0);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 18, 0);
			$$renderer.push(`array.lastIndexOf(primitive)</button>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 19, 0);
			$$renderer.push(`array.lastIndexOf(object)</button>`);
			$.pop_element();
			$$renderer.push(` <hr/>`);
			$.push_element($$renderer, 'hr', 21, 0);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 23, 0);
			$$renderer.push(`clear</button>`);
			$.pop_element();
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;