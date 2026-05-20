import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { afterUpdate, beforeUpdate } from 'svelte';

var root = $.from_html(`<button> </button>`);

export default function ImmutableTodo($$anchor, $$props) {
	$.push($$props, false);

	let todo = $.prop($$props, 'todo', 13);
	let btn = $.mutable_source(void 0, true);

	beforeUpdate(() => {
		console.log('beforeUpdate:' + todo().id);
	});

	afterUpdate(() => {
		console.log('afterUpdate:' + todo().id);
	});

	$.legacy_pre_effect(() => ($.deep_read_state(todo())), () => {
		console.log('$:' + todo().id);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get todo() {
			return todo();
		},

		set todo($$value) {
			todo($$value);
			$.flush();
		}
	};

	$.init(true);

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.bind_this(button, ($$value) => $.set(btn, $$value), () => $.get(btn));

	$.template_effect(() => $.set_text(text, `${(
		$.deep_read_state(todo()),
		$.untrack(() => todo().done ? 'X' : '')
	) ?? ''}
	${($.deep_read_state(todo()), $.untrack(() => todo().id)) ?? ''}`));

	$.event('click', button, function ($$arg) {
		$.bubble_event.call(this, $$props, $$arg);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}