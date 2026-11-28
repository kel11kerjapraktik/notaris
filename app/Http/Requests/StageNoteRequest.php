<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StageNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        if ($this->routeIs('cases.approve-doc', 'cases.reject-doc', 'cases.approve-draft', 'cases.request-revision')) {
            return $this->user()?->isNotaris() ?? false;
        }

        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $required = $this->routeIs('cases.skip', 'cases.revert', 'cases.reject-doc', 'cases.request-revision');

        return [
            'notes' => $required
                ? ['required', 'string', 'min:3', 'max:1000']
                : ['nullable', 'string', 'max:1000'],
        ];
    }
}
