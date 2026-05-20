import * as $ from 'svelte/internal/server';
import { afterUpdate, beforeUpdate } from 'svelte';

export default function ImmutableTodo($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let todo = $$props['todo'];
		let btn;

		beforeUpdate(() => {
			console.log('beforeUpdate:' + todo.id);
		});

		afterUpdate(() => {
			console.log('afterUpdate:' + todo.id);
		});

		$: console.log('$:' + todo.id);

		$$renderer.push(`<button>${$.escape(todo.done ? 'X' : '')}
	${$.escape(todo.id)}</button>`);

		$.bind_props($$props, { todo });
	});
}